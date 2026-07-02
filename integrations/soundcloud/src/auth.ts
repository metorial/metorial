import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let tokenClient = createAxios({
  baseURL: 'https://secure.soundcloud.com'
});

let apiClient = createAxios({
  baseURL: 'https://api.soundcloud.com'
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

    scopes: [
      {
        title: 'Default',
        description: 'Full access to the SoundCloud API on behalf of the user',
        scope: '*'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let codeVerifier = generateCodeVerifier();
      let codeChallenge = await generateCodeChallenge(codeVerifier);

      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      return {
        url: `https://soundcloud.com/connect?${params.toString()}`,
        callbackState: { codeVerifier }
      };
    },

    handleCallback: async ctx => {
      let codeVerifier = ctx.callbackState?.codeVerifier as string;

      let response = await tokenClient.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          code: ctx.code,
          code_verifier: codeVerifier
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

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
        throw new Error('No refresh token available');
      }

      let response = await tokenClient.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

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
    }) => {
      let response = await apiClient.get('/me', {
        headers: {
          Authorization: `OAuth ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.urn || String(user.id),
          name: user.full_name || user.username,
          email: user.email,
          imageUrl: user.avatar_url
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('SoundCloud application Client ID'),
      clientSecret: z.string().describe('SoundCloud application Client Secret')
    }),

    getOutput: async ctx => {
      let credentials = btoa(`${ctx.input.clientId}:${ctx.input.clientSecret}`);

      let response = await tokenClient.post(
        '/oauth/token',
        new URLSearchParams({
          grant_type: 'client_credentials'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          expiresAt
        }
      };
    }
  });

let generateCodeVerifier = (): string => {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  let bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 64; i++) {
    result += chars[bytes[i]! % chars.length];
  }
  return result;
};

let generateCodeChallenge = async (verifier: string): Promise<string> => {
  let encoder = new TextEncoder();
  let data = encoder.encode(verifier);
  let digest = await crypto.subtle.digest('SHA-256', data);
  let bytes = new Uint8Array(digest);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
