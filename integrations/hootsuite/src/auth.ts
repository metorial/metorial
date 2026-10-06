import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { HOOTSUITE_BASE_URL, HootsuiteClient, upstreamFailure } from './lib/client';

let outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional()
});
type AuthOutput = z.infer<typeof outputSchema>;

let normalizeTokens = (value: unknown, previousRefreshToken?: string) => {
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'expires_in' in value
  ) {
    let seconds = value.expires_in;
    if (
      typeof seconds !== 'number' ||
      !Number.isFinite(seconds) ||
      seconds <= 0 ||
      !Number.isFinite(new Date(Date.now() + seconds * 1000).getTime())
    ) {
      throw createApiServiceError(
        'Hootsuite returned an invalid OAuth token expiry. Reconnect the account.',
        { reason: 'oauth_token_response' }
      );
    }
  }
  return normalizeOAuthTokenResponse(value, {
    providerLabel: 'Hootsuite',
    previousRefreshToken,
    refreshTokenFallbackMode: 'falsy',
    expiresInType: 'number'
  });
};

let exchangeToken = async (clientId: string, clientSecret: string, body: URLSearchParams) => {
  let credentials = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
  let api = createAuthenticatedAxios({
    baseURL: HOOTSUITE_BASE_URL,
    authHeader: { value: `Basic ${credentials}` },
    contentType: 'application/x-www-form-urlencoded',
    timeout: 30_000,
    maxRedirects: 0,
    errorAdapter: error => upstreamFailure(error, 'OAuth token exchange')
  });
  let response = await api.post<unknown>('/oauth2/token', body.toString());
  return response.data;
};

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth2',
    scopes: [
      {
        title: 'Offline Access',
        description: 'Allows refreshing access without signing in again',
        scope: 'offline'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(' '),
        state: ctx.state
      });
      return { url: `${HOOTSUITE_BASE_URL}/oauth2/auth?${params.toString()}` };
    },
    handleCallback: async ctx => {
      let value = await exchangeToken(
        ctx.clientId,
        ctx.clientSecret,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        })
      );
      return { output: normalizeTokens(value) };
    },
    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError(
          'Reconnect Hootsuite with Offline Access to obtain a refresh token.',
          { reason: 'missing_refresh_token' }
        );
      let value = await exchangeToken(
        ctx.clientId,
        ctx.clientSecret,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        })
      );
      return { output: normalizeTokens(value, ctx.output.refreshToken) };
    },
    getProfile: async (ctx: { output: AuthOutput }) => {
      let me = await new HootsuiteClient(ctx.output.token).getMe();
      return {
        profile: {
          id: me.id,
          name: me.fullName || me.email || `Member ${me.id}`,
          email: me.email
        }
      };
    }
  });
