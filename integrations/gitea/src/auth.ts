import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { GiteaClient } from './lib/client';
import { normalizeBaseUrl } from './lib/validation';

type AuthOutput = {
  token: string;
  baseUrl: string;
  authorizationType?: 'token' | 'Bearer';
  refreshToken?: string;
  expiresAt?: string;
};
const instanceUrl = z
  .string()
  .describe(
    'Gitea instance URL, including any installation subpath, such as https://git.example.com/gitea'
  );
const tokenClient = (baseUrl: string) =>
  createAuthenticatedAxios({
    baseURL: baseUrl,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    errorAdapter: error =>
      buildApiServiceError(error, {
        parent: {},
        providerLabel: 'Gitea OAuth',
        reason: 'gitea_oauth_error'
      })
  });
const profile = async (output: {
  token: string;
  baseUrl: string;
  authorizationType?: 'token' | 'Bearer';
}) => {
  const user = await new GiteaClient(output).getAuthenticatedUser();
  return {
    profile: {
      id: String(user.id),
      name: user.full_name || user.login,
      email: user.email || undefined,
      imageUrl: user.avatar_url || undefined
    }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      baseUrl: z.string(),
      authorizationType: z.enum(['token', 'Bearer']).optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth2',
    key: 'oauth2',
    scopes: [
      {
        title: 'Manage Repositories',
        description:
          'Read and manage repositories, files, branches, pull requests, and releases',
        scope: 'write:repository'
      },
      {
        title: 'Manage Issues',
        description: 'Read and manage issues, comments, labels, and milestones',
        scope: 'write:issue'
      },
      {
        title: 'Manage Organizations',
        description: 'Read and manage organizations, teams, and membership',
        scope: 'write:organization'
      },
      {
        title: 'Read Profile',
        description: 'Identify the authenticated user',
        scope: 'read:user'
      }
    ],
    inputSchema: z.object({ baseUrl: instanceUrl }),
    getAuthorizationUrl: async ctx => {
      const baseUrl = normalizeBaseUrl(ctx.input.baseUrl);
      const params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });
      if (ctx.scopes.length) params.set('scope', ctx.scopes.join(' '));
      return { url: `${baseUrl}/login/oauth/authorize?${params}`, input: { baseUrl } };
    },
    handleCallback: async ctx => {
      const baseUrl = normalizeBaseUrl(ctx.input.baseUrl);
      const response = await tokenClient(baseUrl).post(
        '/login/oauth/access_token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri
        }).toString()
      );
      const normalized = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Gitea'
      });
      return { output: { ...normalized, baseUrl, authorizationType: 'Bearer' as const } };
    },
    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError('Reconnect Gitea: no OAuth refresh token is available.');
      const baseUrl = normalizeBaseUrl(ctx.output.baseUrl);
      const response = await tokenClient(baseUrl).post(
        '/login/oauth/access_token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString()
      );
      const normalized = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Gitea',
        previousRefreshToken: ctx.output.refreshToken
      });
      return { output: { ...normalized, baseUrl, authorizationType: 'Bearer' as const } };
    },
    getProfile: async (ctx: { output: AuthOutput }) => profile(ctx.output)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'pat',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Personal access token with permissions for the operations you need'),
      baseUrl: instanceUrl
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('Provide a non-empty Gitea personal access token.');
      return {
        output: {
          token: ctx.input.token.trim(),
          baseUrl: normalizeBaseUrl(ctx.input.baseUrl),
          authorizationType: 'token' as const
        }
      };
    },
    getProfile: async (ctx: { output: AuthOutput }) => profile(ctx.output)
  });
