import { createAxios, normalizeOAuthTokenResponse, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { STRIPE_API_VERSION } from './lib/client';
import { stripeApiError, stripeServiceError } from './lib/errors';

let stripeAxios = createAxios({
  baseURL: 'https://api.stripe.com',
  headers: { 'Stripe-Version': STRIPE_API_VERSION }
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

let appsOAuthAxios = createAxios({
  baseURL: 'https://api.stripe.com',
  headers: { 'Stripe-Version': STRIPE_API_VERSION }
});

appsOAuthAxios.interceptors.response.use(
  response => response,
  error => {
    throw stripeApiError(error, 'Apps OAuth token request');
  }
);

connectAxios.interceptors.response.use(
  response => response,
  error => {
    throw stripeApiError(error, 'OAuth request');
  }
);

const STRIPE_APPS_ACCESS_TOKEN_SECONDS = 3600;

let appsTokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  stripe_user_id: z.string().min(1).optional(),
  expires_in: z.number().positive().optional()
});

let exchangeAppTokens = async (
  developerKey: string,
  params: Record<string, string>,
  previous?: { refreshToken?: string; connectedAccountId?: string }
) => {
  if (!/^sk_(live|test)_/.test(developerKey)) {
    throw stripeServiceError(
      'Stripe Apps OAuth requires the app developer account secret API key for the matching mode. Restricted keys are not supported.'
    );
  }
  let response = await appsOAuthAxios.post(
    '/v1/oauth/token',
    new URLSearchParams(params).toString(),
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${developerKey}:`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      maxRedirects: 0
    }
  );
  let parsed = appsTokenSchema.safeParse(response.data);
  if (!parsed.success) {
    throw stripeServiceError(
      'Stripe Apps returned an invalid OAuth token response. Reconnect your account.'
    );
  }
  let output = normalizeOAuthTokenResponse(
    {
      ...parsed.data,
      expires_in: parsed.data.expires_in ?? STRIPE_APPS_ACCESS_TOKEN_SECONDS
    },
    {
      providerLabel: 'Stripe Apps',
      required: true,
      previousRefreshToken: previous?.refreshToken
    }
  );
  let connectedAccountId = parsed.data.stripe_user_id ?? previous?.connectedAccountId;
  if (!output.refreshToken || !connectedAccountId) {
    throw stripeServiceError(
      'Stripe Apps did not return the refresh token or account identity. Reconnect your account.'
    );
  }
  return { ...output, connectedAccountId };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Stripe API secret key or OAuth access token'),
      refreshToken: z.string().optional().describe('Stripe OAuth refresh token'),
      expiresAt: z.string().optional().describe('OAuth access token expiration time'),
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
      token: z
        .string()
        .describe(
          'Stripe secret or restricted API key (sk_live_, sk_test_, rk_live_, or rk_test_); restricted keys need account read and permissions for the tools used'
        )
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
    name: 'OAuth (Stripe Apps)',
    key: 'oauth_apps',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Stripe Apps OAuth setup',
        url: 'https://docs.stripe.com/stripe-apps/api-authentication/oauth'
      }
    ],
    scopes: [],
    getAuthorizationUrl: async ctx => {
      if (!ctx.clientId || !ctx.state) {
        throw stripeServiceError(
          'Configure the Stripe App client ID and restart authorization.'
        );
      }
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });
      return {
        url: `https://marketplace.stripe.com/oauth/v2/authorize?${params}`,
        callbackState: {
          state: ctx.state,
          clientId: ctx.clientId,
          redirectUri: ctx.redirectUri
        }
      };
    },
    handleCallback: async ctx => {
      let saved = z
        .object({
          state: z.string().min(1),
          clientId: z.string().min(1),
          redirectUri: z.string().min(1)
        })
        .safeParse(ctx.callbackState);
      if (
        !saved.success ||
        saved.data.state !== ctx.state ||
        saved.data.clientId !== ctx.clientId ||
        saved.data.redirectUri !== ctx.redirectUri ||
        !ctx.code ||
        ctx.callbackParams?.error
      ) {
        throw stripeServiceError(
          'Stripe Apps OAuth callback is invalid or expired. Restart authorization.'
        );
      }
      return {
        output: await exchangeAppTokens(ctx.clientSecret, {
          grant_type: 'authorization_code',
          code: ctx.code
        })
      };
    },
    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; connectedAccountId?: string };
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw stripeServiceError(
          'Stripe Apps refresh token is missing. Reconnect using OAuth.'
        );
      }
      return {
        output: await exchangeAppTokens(
          ctx.clientSecret,
          {
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken
          },
          ctx.output
        )
      };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      let response = await stripeAxios.get('/v1/account', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
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
