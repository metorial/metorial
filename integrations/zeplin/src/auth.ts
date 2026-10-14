import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let api = createAuthenticatedAxios({
  baseURL: 'https://api.zeplin.dev/v1',
  timeout: 30_000,
  errorAdapter: error =>
    buildApiServiceError(error, { providerLabel: 'Zeplin', reason: 'zeplin_api_error' })
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
        response_type: 'code',
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

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Zeplin',
          operation: 'token exchange'
        })
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
        throw createApiServiceError(
          'Zeplin refresh token is missing. Reconnect your account.'
        );
      }

      let response = await api.post('/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Zeplin',
          operation: 'token refresh',
          previousRefreshToken: ctx.output.refreshToken
        })
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
