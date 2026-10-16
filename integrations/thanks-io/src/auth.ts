import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let dashboardAxios = createAuthenticatedAxios({
  baseURL: 'https://dashboard.thanks.io',
  contentType: 'application/x-www-form-urlencoded',
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Thanks.io',
      reason: 'thanks_io_oauth_failed',
      operation: 'OAuth'
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
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',
    inputSchema: z.object({
      token: z.string().describe('Thanks.io Personal Access Token from Settings → API Access')
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.token } }),
    getProfile: async (ctx: { output: { token: string } }) => {
      let api = createAuthenticatedAxios({
        baseURL: 'https://api.thanks.io/api/v2',
        authHeader: { value: `Bearer ${ctx.output.token}` },
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Thanks.io',
            reason: 'thanks_io_api_failed'
          })
      });
      await api.get('/mailing-lists/', { params: { items_per_page: 1 } });
      return { profile: {} };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [],
    getAuthorizationUrl: async ctx => ({
      url: `https://dashboard.thanks.io/oauth/authorize?${new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      }).toString()}`
    }),
    handleCallback: async ctx => {
      let response = await dashboardAxios.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          code: ctx.code
        }).toString()
      );
      return {
        output: normalizeOAuthTokenResponse(response.data, { providerLabel: 'Thanks.io' })
      };
    },
    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'Thanks.io refresh token is missing. Reconnect your account.'
        );
      }
      let response = await dashboardAxios.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        }).toString()
      );
      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Thanks.io',
          previousRefreshToken: ctx.output.refreshToken,
          refreshTokenFallbackMode: 'falsy'
        })
      };
    }
  });
