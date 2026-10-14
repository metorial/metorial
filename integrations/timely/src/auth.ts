import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let http = createAuthenticatedAxios({
  baseURL: 'https://api.timelyapp.com/1.1',
  timeout: 30000,
  errorAdapter: error =>
    buildApiServiceError(error, { providerLabel: 'Timely', reason: 'timely_api_error' })
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
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.timely.com/'
      }
    ],
    scopes: [
      {
        scope: 'manage',
        title: 'Manage workspace resources',
        description: 'Access Timely resources according to your workspace role'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });
      if (ctx.scopes.length) params.set('scope', ctx.scopes.join(' '));
      return { url: `https://api.timelyapp.com/1.1/oauth/authorize?${params.toString()}` };
    },
    handleCallback: async ctx => {
      let response = await http.post('/oauth/token', {
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      });
      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Timely',
          operation: 'authorization'
        })
      };
    },
    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'This Timely connection has no refresh token. Reconnect the account to renew authorization.'
        );
      }
      let response = await http.post('/oauth/token', {
        grant_type: 'refresh_token',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken
      });
      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Timely',
          operation: 'token refresh',
          previousRefreshToken: ctx.output.refreshToken,
          refreshTokenFallbackMode: 'falsy'
        })
      };
    },
    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
    }) => {
      let accountsRes = await http.get('/accounts', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });
      let accountId = accountsRes.data?.[0]?.id;
      if (!accountId) return { profile: {} };
      let userRes = await http.get(`/${accountId}/users/current`, {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });
      let user = userRes.data;
      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: user.name,
          imageUrl: user.avatar?.large_retina
        }
      };
    }
  });
