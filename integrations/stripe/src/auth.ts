import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { stripeApiError, stripeServiceError } from './lib/errors';

let stripeAxios = createAxios({
  baseURL: 'https://api.stripe.com'
});

let connectAxios = createAxios({
  baseURL: 'https://connect.stripe.com'
});

stripeAxios.interceptors.response.use(
  response => response,
  error => {
    throw stripeApiError(error, 'profile request');
  }
);

connectAxios.interceptors.response.use(
  response => response,
  error => {
    throw stripeApiError(error, 'OAuth request');
  }
);

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Stripe API secret key or OAuth access token'),
      refreshToken: z.string().optional().describe('Stripe Connect OAuth refresh token'),
      connectedAccountId: z
        .string()
        .optional()
        .describe('Connected Stripe account ID returned by OAuth')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Stripe secret API key (starts with sk_live_ or sk_test_)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await stripeAxios.get('/v1/account', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });
      let account = response.data;
      return {
        profile: {
          id: account.id,
          email: account.email || undefined,
          name:
            account.settings?.dashboard?.display_name ||
            account.business_profile?.name ||
            undefined
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth (Stripe Connect)',
    key: 'oauth_connect',
    scopes: [
      {
        title: 'Read & Write',
        description: 'Full read and write access to the connected Stripe account',
        scope: 'read_write'
      },
      {
        title: 'Read Only',
        description: 'Read-only access to the connected Stripe account',
        scope: 'read_only'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        scope: ctx.scopes.join(' '),
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://connect.stripe.com/oauth/authorize?${params.toString()}`
      };
    },
    handleCallback: async ctx => {
      let response = await connectAxios.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      if (!data.access_token) {
        throw stripeServiceError('Stripe OAuth response did not include an access token.');
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          connectedAccountId: data.stripe_user_id
        }
      };
    },
    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw stripeServiceError('Stripe OAuth refresh requires a refresh token.');
      }

      let response = await connectAxios.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      if (!data.access_token) {
        throw stripeServiceError(
          'Stripe OAuth refresh response did not include an access token.'
        );
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          connectedAccountId: data.stripe_user_id || ctx.output.connectedAccountId
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; connectedAccountId?: string };
      input: {};
      scopes: string[];
    }) => {
      let response = await stripeAxios.get('/v1/account', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });
      let account = response.data;
      return {
        profile: {
          id: account.id,
          email: account.email || undefined,
          name:
            account.settings?.dashboard?.display_name ||
            account.business_profile?.name ||
            undefined
        }
      };
    }
  });
