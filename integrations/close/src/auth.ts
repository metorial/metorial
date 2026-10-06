import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client, type CloseAuth, closeApiError, nonEmpty } from './lib/client';
import { parseResponse } from './lib/models';

const api = createAuthenticatedAxios({
  baseURL: 'https://api.close.com',
  contentType: 'application/x-www-form-urlencoded',
  timeout: 30000,
  maxRedirects: 0,
  errorAdapter: closeApiError
});
const tokenSchema = z.object({
  token_type: z.literal('Bearer'),
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z
    .number()
    .positive()
    .max(86400 * 365),
  organization_id: z.string().min(1).optional(),
  user_id: z.string().min(1).optional()
});
const tokenOutput = (
  value: unknown,
  previous?: { organizationId?: string; userId?: string }
) => {
  const data = parseResponse(tokenSchema, value);
  const tokens = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Close',
    required: true,
    expiresInType: 'number'
  });
  if (
    previous?.organizationId &&
    data.organization_id &&
    previous.organizationId !== data.organization_id
  )
    throw createApiServiceError(
      'Close refreshed a different organization. Reconnect to the intended organization.'
    );
  if (previous?.userId && data.user_id && previous.userId !== data.user_id)
    throw createApiServiceError(
      'Close refreshed a different user. Reconnect with the intended user.'
    );
  return {
    ...tokens,
    authType: 'oauth' as const,
    organizationId: data.organization_id ?? previous?.organizationId,
    userId: data.user_id ?? previous?.userId
  };
};
const profile = async (output: CloseAuth & { userId?: string }) => {
  const user = await new Client(output).getMe();
  if (
    (output.userId && output.userId !== user.id) ||
    (output.organizationId &&
      !user.organizations.some(org => org.id === output.organizationId))
  )
    throw createApiServiceError(
      'The Close credential no longer matches the connected user or organization. Reconnect.'
    );
  return {
    profile: {
      id: user.id,
      email: user.email,
      name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
      imageUrl: user.image ?? undefined
    }
  };
};
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authType: z.enum(['oauth', 'api_key']),
      organizationId: z.string().optional(),
      userId: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.close.com/api/overview/oauth-authentication'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.close.com/api/overview/oauth-authentication'
      }
    ],
    scopes: [
      {
        title: 'Full Access',
        description: 'Read and write organization CRM data as the connected user',
        scope: 'all.full_access'
      },
      {
        title: 'Offline Access',
        description: 'Refresh access tokens without repeated sign-in',
        scope: 'offline_access'
      }
    ],
    getAuthorizationUrl: async ctx => ({
      url: `https://app.close.com/oauth2/authorize/?${new URLSearchParams({ client_id: ctx.clientId, response_type: 'code', redirect_uri: ctx.redirectUri, state: ctx.state, scope: ctx.scopes.join(' ') })}`
    }),
    handleCallback: async ctx => {
      const response = await api.post<unknown>(
        '/oauth2/token/',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString()
      );
      return { output: tokenOutput(response.data) };
    },
    handleTokenRefresh: async (ctx: {
      output: CloseAuth & { refreshToken?: string; userId?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError(
          'The Close refresh token is missing. Reconnect with Offline Access.'
        );
      const response = await api.post<unknown>(
        '/oauth2/token/',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }).toString()
      );
      return { output: tokenOutput(response.data, ctx.output) };
    },
    getProfile: async (ctx: { output: CloseAuth & { userId?: string } }) => profile(ctx.output)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Close API key from Settings > Developer > API Keys. Scoped to its user and organization.'
        )
    }),
    getOutput: async (ctx: { input: { apiKey: string } }) => {
      const token = nonEmpty(ctx.input.apiKey, 'API key');
      const user = await new Client({ token, authType: 'api_key' }).getMe();
      return {
        output: {
          token,
          authType: 'api_key' as const,
          userId: user.id,
          organizationId:
            user.organizations.length === 1 ? user.organizations[0]?.id : undefined
        }
      };
    },
    getProfile: async (ctx: { output: CloseAuth & { userId?: string } }) => profile(ctx.output)
  });
