import { Buffer } from 'node:buffer';
import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { vercelApiError, vercelServiceError } from './lib/errors';

let axiosInstance = createAxios({
  baseURL: 'https://api.vercel.com'
});

let generateCodeVerifier = () => {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let randomValues = new Uint8Array(96);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues, value => chars[value % chars.length]!).join('');
};

let generateCodeChallenge = async (codeVerifier: string) => {
  let digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));

  return Buffer.from(digest).toString('base64url');
};

let requestVercelAuth = async <T>(operation: string, run: () => Promise<{ data: T }>) => {
  try {
    let response = await run();
    return response.data;
  } catch (error) {
    throw vercelApiError(error, operation);
  }
};

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
    name: 'Vercel OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'OpenID',
        description: 'Required for user identification via ID Token',
        scope: 'openid'
      },
      {
        title: 'Email',
        description: "Access to the user's email address",
        scope: 'email'
      },
      {
        title: 'Profile',
        description: "Access to the user's basic profile information",
        scope: 'profile'
      },
      {
        title: 'Offline Access',
        description: 'Issue a refresh token for long-lived access',
        scope: 'offline_access'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let codeVerifier = generateCodeVerifier();
      let codeChallenge = await generateCodeChallenge(codeVerifier);
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      return {
        url: `https://vercel.com/oauth/authorize?${params.toString()}`,
        callbackState: { codeVerifier }
      };
    },

    handleCallback: async ctx => {
      let params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        code_verifier: ctx.callbackState?.codeVerifier ?? ctx.state
      });

      let data = await requestVercelAuth<any>('exchange OAuth code', () =>
        axiosInstance.post('/login/oauth/token', params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );
      if (!data.access_token) {
        throw vercelServiceError(
          'Vercel OAuth token response did not include an access token.'
        );
      }
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken
      });

      let data = await requestVercelAuth<any>('refresh OAuth token', () =>
        axiosInstance.post('/login/oauth/token', params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );
      if (!data.access_token) {
        throw vercelServiceError(
          'Vercel OAuth refresh response did not include an access token.'
        );
      }
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let data = await requestVercelAuth<any>('get OAuth profile', () =>
        axiosInstance.get('/v2/user', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        })
      );

      let user = data.user;
      if (!user) {
        throw vercelServiceError('Vercel profile response did not include a user.');
      }

      return {
        profile: {
          id: user.uid,
          email: user.email,
          name: user.name || user.username,
          imageUrl: user.avatar
            ? `https://api.vercel.com/www/avatar/${user.avatar}`
            : undefined,
          username: user.username
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',

    inputSchema: z.object({
      token: z.string().describe('Vercel Access Token (Bearer token)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { token: string };
    }) => {
      let data = await requestVercelAuth<any>('get token profile', () =>
        axiosInstance.get('/v2/user', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          }
        })
      );

      let user = data.user;
      if (!user) {
        throw vercelServiceError('Vercel profile response did not include a user.');
      }

      return {
        profile: {
          id: user.uid,
          email: user.email,
          name: user.name || user.username,
          imageUrl: user.avatar
            ? `https://api.vercel.com/www/avatar/${user.avatar}`
            : undefined,
          username: user.username
        }
      };
    }
  });
