import { createHash, randomBytes } from 'node:crypto';
import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth,
  type SlateAuthWithOauth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { nusiiApiError } from './lib/errors';

let oauthAxios = createAuthenticatedAxios({
  baseURL: 'https://app.nusii.com',
  contentType: 'application/x-www-form-urlencoded',
  errorAdapter: error => nusiiApiError(error, 'token exchange')
});

type NusiiAuth = {
  token: string;
  isOAuth?: boolean;
  refreshToken?: string;
  expiresAt?: string;
};
type RefreshContext = Parameters<
  NonNullable<SlateAuthWithOauth<Record<string, never>, NusiiAuth>['handleTokenRefresh']>
>[0];

let getProfile = async (output: NusiiAuth) => {
  let account = await new Client(output).getAccount();
  return {
    profile: { id: account.accountId, name: account.company, email: account.email }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      isOAuth: z.boolean().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Nusii OAuth documentation',
        url: 'https://developer.nusii.com/#oauth-authentication'
      }
    ],
    scopes: [
      { title: 'Read', description: 'Read your Nusii data', scope: 'read' },
      {
        title: 'Write',
        description: 'Create, update, send, and delete Nusii data together with read access',
        scope: 'write'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let codeVerifier = randomBytes(64).toString('base64url');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
        code_challenge_method: 'S256'
      });
      return {
        url: `https://app.nusii.com/oauth/authorize?${params.toString()}`,
        callbackState: { codeVerifier }
      };
    },
    handleCallback: async ctx => {
      let codeVerifier = ctx.callbackState?.codeVerifier;
      if (typeof codeVerifier !== 'string' || !codeVerifier) {
        throw createApiServiceError(
          'Nusii authorization state is missing. Reconnect your account.',
          {
            reason: 'nusii_oauth_state_missing'
          }
        );
      }
      let response = await oauthAxios.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code_verifier: codeVerifier
        }).toString()
      );
      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Nusii',
            required: true
          }),
          isOAuth: true
        }
      };
    },
    handleTokenRefresh: async (ctx: RefreshContext) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'Nusii refresh token is missing. Reconnect your account.',
          {
            reason: 'nusii_refresh_token_missing'
          }
        );
      }
      let response = await oauthAxios.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString()
      );
      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Nusii',
            required: true,
            previousRefreshToken: ctx.output.refreshToken,
            refreshTokenFallbackMode: 'falsy'
          }),
          isOAuth: true
        }
      };
    },
    getProfile: async (ctx: { output: NusiiAuth }) => getProfile(ctx.output)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z.string().describe('Your Nusii API token from Settings > API')
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('Enter a valid Nusii API token.');
      return { output: { token: ctx.input.token, isOAuth: false } };
    },
    getProfile: async (ctx: { output: NusiiAuth }) => getProfile(ctx.output)
  });
