import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  requestAxiosData,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { fathomApiError } from './lib/errors';

let fathomAxios = createAxios({
  baseURL: 'https://api.fathom.ai/external/v1',
  timeout: 30_000
});

let exchangeToken = async (
  params: URLSearchParams,
  secrets: string[],
  previousRefreshToken?: string
) => {
  let data = await requestAxiosData(
    previousRefreshToken ? 'token refresh' : 'token exchange',
    () =>
      fathomAxios.post('/oauth2/token', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }),
    (error, operation) => fathomApiError(error, secrets, operation)
  );
  let token = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Fathom',
    previousRefreshToken,
    refreshTokenFallbackMode: 'falsy'
  });
  if (!token.token.trim() || !token.refreshToken?.trim()) {
    throw createApiServiceError(
      'Fathom did not return valid access and refresh tokens. Reconnect your account.'
    );
  }
  return { ...token, authMethod: 'oauth' as const };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authMethod: z.enum(['api_key', 'oauth']).optional()
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
        url: 'https://developers.fathom.ai/oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.fathom.ai/sdks/oauth'
      }
    ],
    scopes: [
      {
        title: 'Public API',
        description:
          'Access to the Fathom public API including meetings, transcripts, summaries, and webhooks',
        scope: 'public_api'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        response_type: 'code'
      });
      return { url: `https://fathom.video/external/v1/oauth2/authorize?${params.toString()}` };
    },
    handleCallback: async ctx => ({
      output: await exchangeToken(
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        }),
        [ctx.code, ctx.clientSecret]
      )
    }),
    handleTokenRefresh: async (ctx: {
      clientId: string;
      clientSecret: string;
      output: {
        token: string;
        refreshToken?: string;
        expiresAt?: string;
        authMethod?: 'api_key' | 'oauth';
      };
    }) => {
      if (!ctx.output.refreshToken?.trim()) {
        throw createApiServiceError(
          'Fathom refresh token is missing. Reconnect your account.'
        );
      }
      return {
        output: await exchangeToken(
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret
          }),
          [ctx.output.token, ctx.output.refreshToken, ctx.clientSecret],
          ctx.output.refreshToken
        )
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Fathom API key generated from User Settings → API Access in the Fathom dashboard'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Enter a Fathom API key from User Settings → API Access.');
      }
      return { output: { token: ctx.input.apiKey.trim(), authMethod: 'api_key' as const } };
    }
  });
