import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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
    name: 'HeyGen OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://docs.heygen.com/docs/connecting-your-app-to-heygen-with-oauth-20'
      }
    ],

    scopes: [
      {
        title: 'Full Access',
        description: 'Full API access based on account permissions',
        scope: 'full_access'
      }
    ],

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
        url: `https://app.heygen.com/oauth/authorize?${params.toString()}`,
        input: { codeVerifier }
      };
    },

    inputSchema: z.object({
      codeVerifier: z.string().optional()
    }),

    handleCallback: async ctx => {
      let client = createAxios({ baseURL: 'https://api2.heygen.com' });

      let response = await client.post('/v1/oauth/token', {
        code: ctx.code,
        client_id: ctx.clientId,
        grant_type: 'authorization_code',
        redirect_uri: ctx.redirectUri,
        code_verifier: ctx.input.codeVerifier
      });

      let data = response.data as {
        data?: {
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
        };
        error?: string;
      };

      let tokenData = data.data;
      if (!tokenData?.access_token) {
        throw new Error(
          `HeyGen OAuth error: ${data.error || 'Failed to obtain access token'}`
        );
      }

      let expiresAt: string | undefined;
      if (tokenData.expires_in) {
        expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let client = createAxios({ baseURL: 'https://api2.heygen.com' });

      let response = await client.post('/v1/oauth/refresh_token', {
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId
      });

      let data = response.data as {
        data?: {
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
        };
        error?: string;
      };

      let tokenData = data.data;
      if (!tokenData?.access_token) {
        throw new Error(
          `HeyGen token refresh error: ${data.error || 'Failed to refresh token'}`
        );
      }

      let expiresAt: string | undefined;
      if (tokenData.expires_in) {
        expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: tokenData.access_token,
          refreshToken: tokenData.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
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
        .describe('HeyGen API key from Settings > API in your HeyGen dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let client = createAxios({ baseURL: 'https://api.heygen.com' });

      let response = await client.get('/v2/user/remaining_quota', {
        headers: { 'X-Api-Key': ctx.output.token }
      });

      let data = response.data as {
        data?: {
          remaining_quota?: number;
        };
      };

      return {
        profile: {
          remainingCredits: data.data?.remaining_quota
        }
      };
    }
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
