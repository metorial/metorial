import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth,
  type SlateAuthWithOauth
} from 'slates';
import { z } from 'zod';
import { GitHubActionsClient, githubApiError } from './lib/client';

type AuthOutput = { token: string; refreshToken?: string; expiresAt?: string };
const profile = async (output: AuthOutput) => {
  const user = await new GitHubActionsClient(output.token).getCurrentUser();
  return {
    profile: {
      id: String(user.id),
      email: user.email ?? undefined,
      name: user.name ?? user.login,
      imageUrl: user.avatar_url
    }
  };
};
const oauth = (
  organization: boolean
): SlateAuthWithOauth<Record<string, never>, AuthOutput> => ({
  type: 'auth.oauth',
  key: organization ? 'oauth_organization' : 'oauth',
  name: organization ? 'OAuth (repositories and organizations)' : 'OAuth (repositories)',
  scopes: [
    {
      title: 'Repositories',
      description: 'Manage Actions resources in public and private repositories',
      scope: 'repo'
    },
    ...(organization
      ? [
          {
            title: 'Organization administration',
            description:
              'Manage organization Actions secrets, variables, and self-hosted runners',
            scope: 'admin:org'
          }
        ]
      : [])
  ],
  getAuthorizationUrl: async ctx => ({
    url: `https://github.com/login/oauth/authorize?${new URLSearchParams({ client_id: ctx.clientId, redirect_uri: ctx.redirectUri, state: ctx.state, scope: ctx.scopes.join(' ') })}`
  }),
  handleCallback: async ctx => {
    const http = createAuthenticatedAxios({
      timeout: 30000,
      maxRedirects: 0,
      headers: { Accept: 'application/json' },
      errorAdapter: githubApiError
    });
    const response = await http.post<unknown>('https://github.com/login/oauth/access_token', {
      client_id: ctx.clientId,
      client_secret: ctx.clientSecret,
      code: ctx.code,
      redirect_uri: ctx.redirectUri
    });
    return { output: normalizeOAuthTokenResponse(response.data, { providerLabel: 'GitHub' }) };
  },
  handleTokenRefresh: async ctx => {
    // OAuth App access tokens normally have no expiry/refresh token. GitHub App user tokens may expire.
    if (!ctx.output.refreshToken) {
      if (ctx.output.expiresAt)
        throw createApiServiceError(
          'The expiring GitHub connection has no refresh token. Reconnect to continue.'
        );
      return { output: ctx.output };
    }
    const http = createAuthenticatedAxios({
      timeout: 30000,
      maxRedirects: 0,
      headers: { Accept: 'application/json' },
      errorAdapter: githubApiError
    });
    const response = await http.post<unknown>('https://github.com/login/oauth/access_token', {
      client_id: ctx.clientId,
      client_secret: ctx.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: ctx.output.refreshToken
    });
    return {
      output: normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'GitHub',
        previousRefreshToken: ctx.output.refreshToken
      })
    };
  },
  getProfile: ctx => profile(ctx.output)
});

export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth(oauth(false))
  .addOauth(oauth(true))
  .addTokenAuth({
    type: 'auth.token',
    key: 'personal_access_token',
    name: 'Personal Access Token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'GitHub personal access token with Actions permissions; secrets, variables, environments, and runners need their separate permissions'
        )
    }),
    getOutput: async ctx => {
      const token = ctx.input.token.trim();
      if (!token) throw createApiServiceError('A GitHub personal access token is required.');
      return { output: { token } };
    },
    getProfile: (ctx: { output: AuthOutput }) => profile(ctx.output)
  });
