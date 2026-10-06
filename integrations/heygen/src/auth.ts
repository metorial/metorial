import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  normalizeOAuthTokenResponse,
  SlateAuth,
  type SlateAuthWithOauth
} from 'slates';
import { z } from 'zod';
import { type HeyGenAuth, HeyGenClient } from './lib/client';

type TokenRefreshContext = Parameters<
  NonNullable<SlateAuthWithOauth<{ codeVerifier?: string }, HeyGenAuth>['handleTokenRefresh']>
>[0];

const getHeyGenProfile = async (ctx: { output: HeyGenAuth }) => {
  const user = await new HeyGenClient(ctx.output).getCurrentUser();
  return {
    profile: {
      id: user.username,
      name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username,
      email: user.email ?? undefined
    }
  };
};

const tokenResponse = (data: unknown) =>
  isApiErrorRecord(data) && isApiErrorRecord(data.data) ? data.data : data;

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authType: z.enum(['api_key', 'oauth']).optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'HeyGen OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://mcp.heygen.com/.well-known/oauth-authorization-server'
      }
    ],

    scopes: [],

    getAuthorizationUrl: async ctx => {
      let codeVerifier = generateCodeVerifier();
      let codeChallenge = await generateCodeChallenge(codeVerifier);

      let params = new URLSearchParams({
        client_id: ctx.clientId,
        state: ctx.state,
        redirect_uri: ctx.redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        response_type: 'code'
      });

      return {
        url: `https://api2.heygen.com/v1/oauth/authorize?${params.toString()}`,
        input: { codeVerifier }
      };
    },

    inputSchema: z.object({
      codeVerifier: z.string().optional()
    }),

    handleCallback: async ctx => {
      if (!ctx.input.codeVerifier) {
        throw createApiServiceError(
          'The OAuth PKCE verifier is missing. Start the HeyGen connection again.'
        );
      }
      let client = createAuthenticatedAxios({
        baseURL: 'https://api2.heygen.com',
        errorAdapter: error =>
          buildApiServiceError(error, {
            parent: {},
            providerLabel: 'HeyGen',
            reason: 'heygen_api_error',
            operation: 'OAuth token exchange'
          })
      });

      const body = new URLSearchParams({
        code: ctx.code,
        client_id: ctx.clientId,
        grant_type: 'authorization_code',
        redirect_uri: ctx.redirectUri,
        code_verifier: ctx.input.codeVerifier
      });

      if (ctx.clientSecret) body.set('client_secret', ctx.clientSecret);
      const response = await client.post('/v1/oauth/token', body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      return {
        output: {
          ...normalizeOAuthTokenResponse(tokenResponse(response.data), {
            providerLabel: 'HeyGen'
          }),
          authType: 'oauth' as const
        }
      };
    },

    handleTokenRefresh: async (ctx: TokenRefreshContext) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'No refresh token is available. Reconnect your HeyGen account.'
        );
      }

      let client = createAuthenticatedAxios({
        baseURL: 'https://api2.heygen.com',
        errorAdapter: error =>
          buildApiServiceError(error, {
            parent: {},
            providerLabel: 'HeyGen',
            reason: 'heygen_api_error',
            operation: 'OAuth token refresh'
          })
      });

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId
      });

      if (ctx.clientSecret) body.set('client_secret', ctx.clientSecret);
      const response = await client.post('/v1/oauth/token', body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      return {
        output: {
          ...normalizeOAuthTokenResponse(tokenResponse(response.data), {
            providerLabel: 'HeyGen',
            previousRefreshToken: ctx.output.refreshToken,
            refreshTokenFallbackMode: 'falsy'
          }),
          authType: 'oauth' as const
        }
      };
    },
    getProfile: getHeyGenProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('HeyGen API key from Settings > API in your HeyGen dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'api_key' as const
        }
      };
    },

    getProfile: getHeyGenProfile
  });

let generateCodeVerifier = (): string => {
  let array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

let generateCodeChallenge = async (verifier: string): Promise<string> => {
  let encoder = new TextEncoder();
  let data = encoder.encode(verifier);
  let hash = await crypto.subtle.digest('SHA-256', data);
  let base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
