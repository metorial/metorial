import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  requestAxiosData,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { PrismaClient } from './lib/client';

type AuthOutput = { token: string; refreshToken?: string; expiresAt?: string };

const exchange = async (params: Record<string, string>, previousRefreshToken?: string) => {
  const http = createAuthenticatedAxios({
    timeout: 30000,
    maxRedirects: 0,
    contentType: 'application/x-www-form-urlencoded',
    validateStatus: () => true
  });
  const secrets = Object.values(params).filter(
    value => value && value !== params.grant_type && value !== params.redirect_uri
  );
  const adapt = (error: unknown) =>
    buildApiServiceError(error, {
      parent: {},
      providerLabel: 'Prisma',
      reason: 'oauth_token_exchange',
      operation: 'token exchange',
      extractMessage: (failure, helpers) =>
        secrets.reduce(
          (message, secret) => message.split(secret).join('[redacted]'),
          helpers.extractMessage(failure)
        )
    });
  const data = await requestAxiosData(
    'token exchange',
    async () => {
      const response = await http.post<unknown>(
        'https://auth.prisma.io/token',
        new URLSearchParams(params).toString()
      );
      if (response.status < 200 || response.status >= 300) throw adapt({ response });
      return response;
    },
    adapt
  );
  const output = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Prisma',
    previousRefreshToken,
    required: true
  });
  if (!output.expiresAt || Date.parse(output.expiresAt) <= Date.now())
    throw createApiServiceError(
      'Prisma returned an expired OAuth token. Reconnect to authorize again.',
      { reason: 'oauth_token_response' }
    );
  return output;
};
const profile = async (token: string) => {
  const principal = await new PrismaClient(token).getCurrentUser();
  return {
    profile: {
      id:
        principal.user?.id ?? principal.workspace?.id ?? principal.credential.id ?? undefined,
      name:
        principal.user?.name ??
        principal.workspace?.name ??
        principal.credential.name ??
        'Prisma',
      email: principal.user?.email
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
    scopes: [
      {
        title: 'Workspace Admin',
        description: 'Manage workspace projects, databases, and connections',
        scope: 'workspace:admin'
      },
      {
        title: 'Offline Access',
        description: 'Keep access active with rotating refresh tokens',
        scope: 'offline_access'
      }
    ],
    getAuthorizationUrl: async ctx => ({
      url: `https://auth.prisma.io/authorize?${new URLSearchParams({ client_id: ctx.clientId, redirect_uri: ctx.redirectUri, response_type: 'code', scope: ctx.scopes.join(' '), state: ctx.state }).toString()}`
    }),
    handleCallback: async ctx => ({
      output: await exchange({
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      })
    }),
    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError(
          'Prisma did not provide a refresh token. Reconnect with offline access to continue.',
          { reason: 'missing_refresh_token' }
        );
      return {
        output: await exchange(
          {
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret
          },
          ctx.output.refreshToken
        )
      };
    },
    getProfile: (ctx: { output: AuthOutput }) => profile(ctx.output.token)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Service Token',
    key: 'service_token',
    inputSchema: z.object({
      serviceToken: z
        .string()
        .describe(
          'Prisma Console workspace Settings → Service Tokens. This bearer token does not expire until revoked.'
        )
    }),
    getOutput: async ctx => {
      const token = ctx.input.serviceToken.trim();
      await new PrismaClient(token).getCurrentUser();
      return { output: { token } };
    },
    getProfile: (ctx: { output: AuthOutput }) => profile(ctx.output.token)
  });
