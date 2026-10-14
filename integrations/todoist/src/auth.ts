import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

let authAxios = createAuthenticatedAxios({
  baseURL: 'https://api.todoist.com',
  contentType: 'application/x-www-form-urlencoded',
  errorAdapter: error =>
    buildApiServiceError(error, {
      providerLabel: 'Todoist',
      operation: 'OAuth token exchange',
      reason: 'todoist_oauth_error'
    })
});

let getProfile = async (ctx: { output: { token: string } }) => {
  let user = await new Client({ token: ctx.output.token }).getUser();
  return {
    profile: { id: user.id, email: user.email, name: user.name, imageUrl: user.imageUrl }
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
    scopes: [
      {
        title: 'Read & Write Data',
        description: 'Read and write tasks, projects, labels, comments, and filters',
        scope: 'data:read_write'
      },
      {
        title: 'Delete Data',
        description: 'Delete tasks, comments, labels, and filters',
        scope: 'data:delete'
      },
      {
        title: 'Delete Projects',
        description: 'Delete projects',
        scope: 'project:delete'
      }
    ],
    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(','),
        state: ctx.state
      });
      return { url: `https://app.todoist.com/oauth/authorize?${params.toString()}` };
    },
    handleCallback: async ctx => {
      let response = await authAxios.post(
        '/oauth/access_token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri,
          code: ctx.code
        })
      );
      let tokens = normalizeOAuthTokenResponse(response.data, { providerLabel: 'Todoist' });
      return {
        output: {
          ...tokens,
          // Legacy apps have long-lived tokens and a compatibility expires_in without refresh tokens.
          expiresAt: tokens.refreshToken ? tokens.expiresAt : undefined
        }
      };
    },
    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'This Todoist connection has no refresh token. Reconnect to renew access.'
        );
      }
      let response = await authAxios.post(
        '/oauth/access_token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        })
      );
      return {
        output: {
          ...ctx.output,
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Todoist',
            operation: 'refresh',
            required: true,
            previousRefreshToken: ctx.output.refreshToken
          })
        }
      };
    },
    getProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .min(1)
        .describe('API token from Settings → Integrations → Developer')
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.apiToken } }),
    getProfile
  });
