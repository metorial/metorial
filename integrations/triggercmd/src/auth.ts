import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let httpClient = createAuthenticatedAxios({
  baseURL: 'https://www.triggercmd.com',
  timeout: 30000,
  contentType: 'application/x-www-form-urlencoded',
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'TRIGGERcmd',
      reason: 'triggercmd_oauth_error',
      operation: 'token exchange'
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

    scopes: [
      {
        title: 'Default',
        description: 'Full access to your TRIGGERcmd account',
        scope: 'default'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        response_type: 'code',
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://www.triggercmd.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await httpClient.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'TRIGGERcmd',
          operation: 'token exchange'
        })
      };
    },

    handleTokenRefresh: async (ctx: {
      clientId: string;
      clientSecret: string;
      output: { token: string; refreshToken?: string; expiresAt?: string };
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'The TRIGGERcmd refresh token is missing. Reconnect the account.',
          { reason: 'triggercmd_missing_refresh_token' }
        );
      }
      let response = await httpClient.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'TRIGGERcmd',
          operation: 'token refresh',
          previousRefreshToken: ctx.output.refreshToken,
          refreshTokenFallbackMode: 'falsy'
        })
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your TRIGGERcmd Bearer token, found at the bottom of your profile page or the instructions page'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('A TRIGGERcmd API token is required.', {
          reason: 'triggercmd_missing_token'
        });
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
