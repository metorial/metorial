import { createHash, randomBytes } from 'node:crypto';
import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { type MetorialConfig, normalizeApiUrl, normalizeMetorialConfig } from './config';
import { metorialOAuthError, metorialValidationError } from './lib/errors';

type TokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  scope?: unknown;
  user?: unknown;
  organization?: unknown;
};

type UserInfoResponse = {
  sub?: unknown;
  name?: unknown;
  preferred_username?: unknown;
  email?: unknown;
};

type AuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  apiUrl?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  organizationId?: string;
  organizationName?: string;
};

type AuthContextBase = {
  input?: unknown;
  config?: unknown;
};

type RefreshContext = AuthContextBase & {
  output: AuthOutput;
  clientId: string;
  clientSecret: string;
};

type ProfileContext = AuthContextBase & {
  output: AuthOutput;
};

let generateCodeVerifier = () => randomBytes(32).toString('base64url');

let generateCodeChallenge = (codeVerifier: string) =>
  createHash('sha256').update(codeVerifier).digest('base64url');

let instanceScopes = [
  'organization.instance:read',
  'organization.instance:write',
  'instance.file:read',
  'instance.file:write',
  'instance.file_link:read',
  'instance.file_link:write',
  'instance.secret:read',
  'instance.secret:write',
  'instance.assistant:read',
  'instance.assistant:write',
  'instance.assistant.conversation:read',
  'instance.assistant.conversation:write',
  'instance.skill:read',
  'instance.skill:write',
  'instance.session:read',
  'instance.session:write',
  'instance.provider_oauth.connection:read',
  'instance.provider_oauth.connection:write',
  'instance.provider_oauth.session:read',
  'instance.provider_oauth.session:write',
  'instance.provider_oauth.connection.authentication:read',
  'instance.provider_oauth.connection.event:read',
  'instance.provider_oauth.connection.profile:read',
  'instance.provider_oauth.takeout:read',
  'instance.provider_oauth.takeout:write',
  'instance.provider_oauth.takeIn:read',
  'instance.provider_oauth.takeIn:write',
  'instance.callback:read',
  'instance.callback:write',
  'instance.server.config_vault:read',
  'instance.server.config_vault:write',
  'instance.ssoTenant:read',
  'instance.ssoTenant:write',
  'instance.portal:read',
  'instance.portal:write',
  'instance.portal.access:read',
  'instance.portal.access:write',
  'instance.portal.consumers:read',
  'instance.portal.consumers:write',
  'instance.portal.auth:read',
  'instance.portal.auth:write',
  'instance.portal.server_requests:read',
  'instance.portal.server_requests:write',
  'instance.portal.featured_servers:read',
  'instance.portal.featured_servers:write',
  'instance.provider:read',
  'instance.provider:write',
  'instance.provider.deployment:read',
  'instance.provider.deployment:write',
  'instance.provider.auth:read',
  'instance.provider.auth:write',
  'instance.provider.auth:export',
  'instance.provider.auth:import',
  'instance.provider.session:read',
  'instance.provider.session:write',
  'instance.provider.config:read',
  'instance.provider.config:write',
  'instance.provider.config_vault:read',
  'instance.provider.config_vault:write',
  'instance.provider.group:read',
  'instance.provider.group:write',
  'instance.provider.specification:read',
  'instance.provider.category:read',
  'instance.provider.collection:read',
  'instance.provider.listing:read',
  'instance.provider.publisher:read',
  'instance.provider.tool:read',
  'instance.provider.version:read',
  'instance.provider.custom:read',
  'instance.provider.custom:write',
  'instance.provider.custom.version:read',
  'instance.provider.custom.version:write',
  'instance.provider.custom.environment:read',
  'instance.provider.custom.deployment:read',
  'instance.provider.custom.commit:read',
  'instance.provider.custom.commit:write',
  'instance.provider.custom.code:read',
  'instance.provider.custom.code:write',
  'instance.scm.account:read',
  'instance.scm.installation:read',
  'instance.scm.installation:write',
  'instance.scm.repo:read',
  'instance.scm.repo:write'
] as const;

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let readString = (value: unknown) => (typeof value === 'string' ? value : undefined);

let resolveAuthConfig = (ctx: { config?: unknown; input?: unknown }) =>
  normalizeMetorialConfig({
    ...(isRecord(ctx.config) ? ctx.config : {}),
    ...(isRecord(ctx.input) ? ctx.input : {})
  });

let parseScopes = (scope: unknown) => {
  if (typeof scope === 'string') return scope.split(/\s+/).filter(Boolean);
  if (Array.isArray(scope))
    return scope.filter((item): item is string => typeof item === 'string');
  return undefined;
};

let expiresAtFromSeconds = (expiresIn: unknown) => {
  let seconds =
    typeof expiresIn === 'number'
      ? expiresIn
      : typeof expiresIn === 'string'
        ? Number.parseInt(expiresIn, 10)
        : undefined;

  return seconds && Number.isFinite(seconds)
    ? new Date(Date.now() + seconds * 1000).toISOString()
    : undefined;
};

let exchangeToken = async (
  config: MetorialConfig,
  operation: string,
  params: URLSearchParams
) => {
  let api = createAxios({ baseURL: config.apiUrl });

  try {
    let response = await api.post('/oauth/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data as TokenResponse;
  } catch (error) {
    throw metorialOAuthError(operation, error);
  }
};

let fetchProfile = async (config: MetorialConfig, token: string) => {
  let api = createAxios({ baseURL: config.apiUrl });

  try {
    let response = await api.get('/oauth/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data as UserInfoResponse;
  } catch (error) {
    throw metorialOAuthError('profile lookup', error);
  }
};

let buildOutput = (
  data: TokenResponse,
  profile: UserInfoResponse | null,
  fallback: Partial<AuthOutput> = {}
): AuthOutput => {
  let token = readString(data.access_token);
  if (!token)
    throw metorialValidationError('Metorial OAuth response did not include an access token.');

  let user = isRecord(data.user) ? data.user : {};
  let organization = isRecord(data.organization) ? data.organization : {};

  return {
    token,
    refreshToken: readString(data.refresh_token) ?? fallback.refreshToken,
    expiresAt: expiresAtFromSeconds(data.expires_in) ?? fallback.expiresAt,
    apiUrl: fallback.apiUrl,
    userId: readString(user.id) ?? readString(profile?.sub) ?? fallback.userId,
    userName:
      readString(user.name) ??
      readString(profile?.name) ??
      readString(profile?.preferred_username) ??
      fallback.userName,
    userEmail: readString(user.email) ?? readString(profile?.email) ?? fallback.userEmail,
    organizationId: readString(organization.id) ?? fallback.organizationId,
    organizationName: readString(organization.name) ?? fallback.organizationName
  };
};

let scopeTitle = (scope: string) =>
  scope
    .split(/[.:_#-]+/)
    .filter(Boolean)
    .map(part => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      apiUrl: z.string().optional(),
      userId: z.string().optional(),
      userName: z.string().optional(),
      userEmail: z.string().optional(),
      organizationId: z.string().optional(),
      organizationName: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'OpenID',
        description: 'Issue OpenID Connect identity claims for the authenticated actor.',
        scope: 'openid'
      },
      {
        title: 'Profile',
        description: 'Read the authenticated actor profile name and username.',
        scope: 'profile'
      },
      {
        title: 'Email',
        description: 'Read the authenticated actor email address.',
        scope: 'email'
      },
      ...instanceScopes.map(scope => ({
        title: scopeTitle(scope),
        description: `Grant ${scope} access for Metorial dashboard instance administration.`,
        scope
      }))
    ],
    inputSchema: z.object({
      apiUrl: z
        .string()
        .optional()
        .describe(
          'Optional Metorial API base URL for OAuth. Defaults to the integration apiUrl config.'
        )
    }),

    getAuthorizationUrl: async rawCtx => {
      let ctx = rawCtx as typeof rawCtx & { config?: unknown };
      let config = resolveAuthConfig(ctx);
      let codeVerifier = generateCodeVerifier();
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' '),
        code_challenge: generateCodeChallenge(codeVerifier),
        code_challenge_method: 'S256'
      });

      return {
        url: `${config.apiUrl}/oauth/authorize?${params.toString()}`,
        callbackState: { codeVerifier, apiUrl: config.apiUrl }
      };
    },

    handleCallback: async rawCtx => {
      let ctx = rawCtx as typeof rawCtx & { config?: unknown };
      let config = resolveAuthConfig({
        config: ctx.config,
        input: ctx.callbackState
      });
      let codeVerifier = readString(ctx.callbackState.codeVerifier);
      if (!codeVerifier) {
        throw metorialValidationError(
          'Missing Metorial PKCE code verifier for OAuth callback.'
        );
      }

      let data = await exchangeToken(
        config,
        'authorization code exchange',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          code_verifier: codeVerifier
        })
      );
      let token = readString(data.access_token);
      if (!token) {
        throw metorialValidationError(
          'Metorial OAuth token exchange did not return an access token.'
        );
      }

      let profile = await fetchProfile(config, token);

      return {
        output: buildOutput(data, profile, { apiUrl: config.apiUrl }),
        scopes: parseScopes(data.scope)
      };
    },

    handleTokenRefresh: async (rawCtx: RefreshContext) => {
      let ctx = rawCtx as typeof rawCtx & { config?: unknown };
      let config = resolveAuthConfig({
        config: ctx.config,
        input: ctx.output
      });
      if (!ctx.output.refreshToken) {
        throw metorialValidationError('No Metorial refresh token is available.');
      }

      let data = await exchangeToken(
        config,
        'token refresh',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        })
      );
      let token = readString(data.access_token);
      if (!token) {
        throw metorialValidationError(
          'Metorial OAuth refresh did not return an access token.'
        );
      }

      let profile = await fetchProfile(config, token);

      return {
        output: buildOutput(data, profile, ctx.output)
      };
    },

    getProfile: async (rawCtx: ProfileContext) => {
      let ctx = rawCtx as typeof rawCtx & { config?: unknown };
      let config = resolveAuthConfig({
        config: ctx.config,
        input: ctx.output
      });
      let profile = await fetchProfile(config, ctx.output.token);

      return {
        profile: {
          id: readString(profile.sub) ?? ctx.output.userId,
          name: readString(profile.name) ?? ctx.output.userName,
          email: readString(profile.email) ?? ctx.output.userEmail,
          organizationId: ctx.output.organizationId,
          organizationName: ctx.output.organizationName
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
        .trim()
        .min(1)
        .describe('Metorial API key to use as a bearer token for admin API calls.'),
      apiUrl: z
        .string()
        .trim()
        .optional()
        .describe(
          'Optional Metorial API base URL for API key auth. Defaults to the integration apiUrl config.'
        )
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiKey,
        ...(ctx.input.apiUrl ? { apiUrl: normalizeApiUrl(ctx.input.apiUrl) } : {})
      }
    })
  });
