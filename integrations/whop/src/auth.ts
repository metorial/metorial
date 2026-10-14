import { createHash, randomBytes } from 'node:crypto';
import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { whopApiError } from './lib/errors';

type WhopAuthOutput = { token: string; refreshToken?: string; expiresAt?: string };

let apiAxios = createAuthenticatedAxios({
  baseURL: 'https://api.whop.com',
  errorAdapter: error => whopApiError(error, 'OAuth request')
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
        name: 'Whop OAuth guide',
        url: 'https://docs.whop.com/developer/guides/oauth'
      }
    ],

    scopes: [
      {
        title: 'OpenID',
        description: 'Base identity scope for authentication',
        scope: 'openid'
      },
      {
        title: 'Profile',
        description: 'Access to user profile information (name, username, picture)',
        scope: 'profile'
      },
      {
        title: 'Email',
        description: 'Access to user email and verification status',
        scope: 'email'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let codeVerifier = randomBytes(32).toString('base64url');
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' '),
        code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
        code_challenge_method: 'S256'
      });

      return {
        url: `https://api.whop.com/oauth/authorize?${params.toString()}`,
        callbackState: { codeVerifier }
      };
    },

    handleCallback: async ctx => {
      let codeVerifier = ctx.callbackState?.codeVerifier;
      if (typeof codeVerifier !== 'string' || !codeVerifier) {
        throw createApiServiceError(
          'Whop authorization state is missing. Reconnect your account.'
        );
      }
      let response = await apiAxios.post('/oauth/token', {
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code_verifier: codeVerifier
      });

      return {
        output: normalizeOAuthTokenResponse(response.data, { providerLabel: 'Whop' })
      };
    },

    handleTokenRefresh: async (ctx: {
      output: WhopAuthOutput;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError('Whop refresh token is missing. Reconnect your account.');
      }
      let response = await apiAxios.post('/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Whop',
          previousRefreshToken: ctx.output.refreshToken,
          refreshTokenFallbackMode: 'falsy'
        })
      };
    },

    getProfile: async (ctx: { output: WhopAuthOutput }) => {
      let response = await apiAxios.get('/oauth/userinfo', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data;

      return {
        profile: {
          id: data.sub || data.id,
          email: data.email,
          name: data.name || data.preferred_username || data.username,
          imageUrl: data.picture || data.profile_picture?.url
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('Your Whop API key (company/account API key or app API key)')
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Enter a valid Whop API key.');
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
