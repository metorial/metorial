import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let retentlyAxios = createAxios({
  baseURL: 'https://app.retently.com'
});

retentlyAxios.interceptors.response.use(
  response => response,
  error =>
    Promise.reject(
      buildApiServiceError(error, {
        providerLabel: 'Retently',
        reason: 'retently_oauth_error',
        operation: 'token exchange'
      })
    )
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
        title: 'Full Access',
        description: 'Read and write access to contacts and workflows',
        scope: 'full_access'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });

      return {
        url: `https://app.retently.com/api/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await retentlyAxios.post(
        '/api/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          code: ctx.code
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
          }
        }
      );

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Retently',
          required: true
        })
      };
    },

    handleTokenRefresh: async (ctx: {
      clientId: string;
      clientSecret: string;
      output: { token: string; refreshToken?: string; expiresAt?: string };
    }) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError(
          'Retently refresh token is missing. Reconnect the account.'
        );
      let response = await retentlyAxios.post(
        '/api/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
          }
        }
      );

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Retently',
          operation: 'token refresh',
          required: true,
          previousRefreshToken: ctx.output.refreshToken,
          refreshTokenFallbackMode: 'falsy'
        })
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Retently API key from Settings > API > Tokens')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
