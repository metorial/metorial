import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { kitApiError } from './lib/errors';

let httpClient = createAxios({
  baseURL: 'https://api.kit.com/v4'
});

httpClient.interceptors.response.use(
  response => response,
  error => {
    throw kitApiError(error, 'auth request');
  }
);

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Public',
        description: 'Full access to your Kit account (default scope)',
        scope: 'public'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://api.kit.com/v4/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await httpClient.post('/oauth/token', {
        grant_type: 'authorization_code',
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri
      });

      let token = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Kit',
        operation: 'token exchange'
      });

      return {
        output: {
          token: token.token,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError('Kit refresh token is missing; reconnect the account.');
      }

      let response = await httpClient.post('/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId
      });

      let token = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Kit',
        operation: 'token refresh',
        previousRefreshToken: ctx.output.refreshToken
      });

      return {
        output: {
          token: token.token,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await httpClient.get('/account', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let account = response.data.user;

      return {
        profile: {
          id: account?.id?.toString(),
          name: account?.name,
          email: account?.email_address,
          imageUrl: account?.profile_image?.url
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string()
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await httpClient.get('/account', {
        headers: {
          'X-Kit-Api-Key': ctx.output.token
        }
      });

      let account = response.data.user;

      return {
        profile: {
          id: account?.id?.toString(),
          name: account?.name,
          email: account?.email_address,
          imageUrl: account?.profile_image?.url
        }
      };
    }
  });
