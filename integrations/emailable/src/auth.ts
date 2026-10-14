import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  requestAxiosData,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

let oauthAxios = createAxios({
  baseURL: 'https://app.emailable.com'
});

let exchangeToken = async (body: Record<string, string>, previousRefreshToken?: string) => {
  let data = await requestAxiosData(
    'exchange OAuth token',
    () => oauthAxios.post('/oauth/token', new URLSearchParams(body)),
    (error, operation) =>
      buildApiServiceError(error, {
        providerLabel: 'Emailable',
        operation,
        reason: 'emailable_oauth_error'
      })
  );
  return normalizeOAuthTokenResponse(data, {
    providerLabel: 'Emailable',
    operation: 'token exchange',
    previousRefreshToken,
    refreshTokenFallbackMode: 'falsy',
    required: true,
    expiresInType: 'number'
  });
};

let getProfile = async (ctx: { output: { token: string } }) => {
  let account = await new Client({ token: ctx.output.token }).getAccount();
  return {
    profile: {
      email: account.ownerEmail,
      availableCredits: account.availableCredits
    }
  };
};

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
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe(
          'Your private Emailable API key from the Emailable Dashboard. Public keys only support single email verification and cannot connect this account.'
        )
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.token } }),
    getProfile
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'All Access',
        description: 'Full access to all Emailable API endpoints',
        scope: 'all'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });
      return { url: `https://app.emailable.com/oauth/authorize?${params.toString()}` };
    },
    handleCallback: async ctx => {
      let output = await exchangeToken({
        grant_type: 'authorization_code',
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri
      });
      if (!output.refreshToken) {
        throw createApiServiceError(
          'Emailable did not return a refresh token. Reconnect the account.',
          {
            reason: 'emailable_oauth_error'
          }
        );
      }
      return { output };
    },
    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'The Emailable refresh token is missing. Reconnect the account.',
          {
            reason: 'emailable_oauth_error'
          }
        );
      }
      let output = await exchangeToken(
        {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        },
        ctx.output.refreshToken
      );
      return { output };
    },
    getProfile
  });
