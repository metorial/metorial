import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let api = createAxios({
  baseURL: 'https://api.zeplin.dev/v1'
});

type AuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
};

let fetchProfile = async (token: string) => {
  let response = await api.get('/users/me', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  let user = response.data as {
    id: string;
    email: string;
    username: string;
    avatar?: string;
    emotar?: string;
  };

  return {
    profile: {
      id: user.id,
      email: user.email,
      name: user.username,
      imageUrl: user.avatar
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
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [],

    getAuthorizationUrl: async (ctx: {
      redirectUri: string;
      state: string;
      input: {};
      clientId: string;
      clientSecret: string;
      scopes: string[];
    }) => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://api.zeplin.dev/v1/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async (ctx: {
      code: string;
      state: string;
      redirectUri: string;
      input: {};
      clientId: string;
      clientSecret: string;
      scopes: string[];
      callbackState: Record<string, any>;
    }) => {
      let response = await api.post('/oauth/token', {
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      input: {};
      clientId: string;
      clientSecret: string;
      scopes: string[];
    }) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let response = await api.post('/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: {}; scopes: string[] }) => {
      return fetchProfile(ctx.output.token);
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z.string()
    }),

    getOutput: async (ctx: { input: { token: string } }) => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: AuthOutput; input: { token: string } }) => {
      return fetchProfile(ctx.output.token!);
    }
  });
