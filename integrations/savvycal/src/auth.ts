import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let api = createAuthenticatedAxios({
  baseURL: 'https://api.savvycal.com',
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'SavvyCal',
      reason: 'savvycal_api_error'
    })
});

let oauthApi = createAuthenticatedAxios({
  baseURL: 'https://savvycal.com',
  contentType: 'application/x-www-form-urlencoded',
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'SavvyCal',
      reason: 'savvycal_oauth_error'
    })
});

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

    scopes: [],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      if (ctx.scopes.length > 0) {
        params.set('scope', ctx.scopes.join(' '));
      }

      return {
        url: `https://savvycal.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await oauthApi.post(
        '/oauth/token',
        new URLSearchParams({
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'SavvyCal',
          operation: 'token exchange',
          required: true
        })
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError('Reconnect SavvyCal to obtain a refresh token.');
      }

      let response = await oauthApi.post(
        '/oauth/token',
        new URLSearchParams({
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'SavvyCal',
          operation: 'token refresh',
          previousRefreshToken: ctx.output.refreshToken,
          required: true
        })
      };
    },

    getProfile: async (ctx: any) => {
      let response = await api.get('/v1/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.display_name ?? user.name,
          imageUrl: user.avatar_url
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_token',

    inputSchema: z.object({
      token: z.string().describe('Personal access token (starts with pt_secret_)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await api.get('/v1/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.display_name ?? user.name,
          imageUrl: user.avatar_url
        }
      };
    }
  });
