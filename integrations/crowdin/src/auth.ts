import { createHash, randomBytes } from 'node:crypto';
import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { CrowdinClient } from './lib/client';
import { crowdinError, organizationDomain } from './lib/errors';

type AuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  organizationDomain?: string;
};

const authAxios = createAuthenticatedAxios({
  baseURL: 'https://accounts.crowdin.com',
  timeout: 30000,
  maxRedirects: 0,
  errorAdapter: crowdinError
});

// Crowdin documents organization_domain in its Enterprise OAuth JWT payload.
const tokenDomain = (token: string) => {
  const payload = token.split('.')[1];
  if (!payload) return undefined;
  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
  if (typeof data !== 'object' || data === null || !('organization_domain' in data))
    return undefined;
  const domain = data.organization_domain;
  if (domain === undefined || domain === null || domain === '') return undefined;
  if (typeof domain !== 'string')
    throw createApiServiceError(
      'Crowdin returned an invalid organization domain. Reconnect the account.'
    );
  return organizationDomain(domain);
};

const tokenOutput = (data: unknown, previous?: AuthOutput): AuthOutput => {
  const parsed = z
    .object({
      access_token: z.string().min(1),
      refresh_token: z.string().min(1).optional(),
      expires_in: z.number().positive()
    })
    .safeParse(data);
  if (
    !parsed.success ||
    !Number.isFinite(new Date(Date.now() + parsed.data.expires_in * 1000).getTime())
  ) {
    throw createApiServiceError(
      'Crowdin returned an invalid OAuth token or expiration. Reconnect the account.'
    );
  }
  const output = normalizeOAuthTokenResponse(parsed.data, {
    providerLabel: 'Crowdin',
    required: true,
    previousRefreshToken: previous?.refreshToken
  });
  if (!output.refreshToken)
    throw createApiServiceError(
      'Crowdin did not return a refresh token. Reconnect the account.'
    );
  return {
    ...previous,
    ...output,
    organizationDomain: tokenDomain(output.token) ?? previous?.organizationDomain
  };
};

const profile = async (output: AuthOutput) => {
  const user = await new CrowdinClient(output).getAuthenticatedUser();
  if (!Number.isSafeInteger(user?.id) || user.id <= 0) {
    throw createApiServiceError(
      'Crowdin did not return a valid authenticated user. Reconnect the account.'
    );
  }
  return {
    profile: {
      id: String(user.id),
      email: user.email,
      name: user.fullName ?? user.username,
      imageUrl: user.avatarUrl,
      username: user.username
    }
  };
};

export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      organizationDomain: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'Project Settings',
        description: 'Discover projects and manage their settings.',
        scope: 'project.settings'
      },
      {
        title: 'Source Content',
        description: 'Manage source files, directories, branches, and strings.',
        scope: 'project.source'
      },
      {
        title: 'Translations',
        description: 'Manage and export translations.',
        scope: 'project.translation'
      },
      { title: 'Tasks', description: 'Manage project tasks.', scope: 'project.task' },
      { title: 'Status', description: 'Read translation progress.', scope: 'project.status' },
      {
        title: 'Members',
        description: 'Read project members for task assignments.',
        scope: 'project.member'
      },
      {
        title: 'Translation Memory',
        description: 'Manage and export translation memories.',
        scope: 'tm'
      },
      {
        title: 'Glossary',
        description: 'Manage terminology and glossary exports.',
        scope: 'glossary'
      }
    ],
    getAuthorizationUrl: async ctx => {
      const verifier = randomBytes(32).toString('base64url');
      const params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        code_challenge: createHash('sha256').update(verifier).digest('base64url'),
        code_challenge_method: 'S256'
      });
      return {
        url: `https://accounts.crowdin.com/oauth/authorize?${params}`,
        callbackState: { verifier, state: ctx.state }
      };
    },
    handleCallback: async ctx => {
      const state = z
        .object({ verifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/), state: z.string() })
        .safeParse(ctx.callbackState);
      if (!state.success || state.data.state !== ctx.state)
        throw createApiServiceError(
          'The Crowdin authorization state is invalid. Restart authorization.'
        );
      const response = await authAxios.post('/oauth/token', {
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        code: ctx.code,
        code_verifier: state.data.verifier
      });
      return { output: tokenOutput(response.data) };
    },
    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError(
          'The Crowdin refresh token is missing. Reconnect the account.'
        );
      const response = await authAxios.post('/oauth/token', {
        grant_type: 'refresh_token',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken
      });
      return { output: tokenOutput(response.data, ctx.output) };
    },
    getProfile: (ctx: { output: AuthOutput }) => profile(ctx.output)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_token',
    inputSchema: z.object({
      token: z.string().describe('Crowdin personal access token from Account Settings > API'),
      organizationDomain: z
        .string()
        .optional()
        .describe(
          'Crowdin Enterprise organization subdomain, such as myorg. Omit for standard Crowdin.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('Provide a Crowdin personal access token.');
      return {
        output: {
          token: ctx.input.token,
          organizationDomain: organizationDomain(ctx.input.organizationDomain)
        }
      };
    },
    getProfile: (ctx: { output: AuthOutput }) => profile(ctx.output)
  });
