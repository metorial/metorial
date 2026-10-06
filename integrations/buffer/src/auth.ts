import { createHash, randomBytes } from 'node:crypto';
import {
  createAuthenticatedAxios,
  getOAuthExpiresAtFromExpiresIn,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { type BufferAuth, Client } from './lib/client';
import { credential, invalid, safeError } from './lib/errors';

const profile = async (output: BufferAuth) => {
  const account = await new Client(output).getUser();
  return {
    profile: {
      id: account.id,
      name: account.name ?? account.email,
      email: account.email,
      imageUrl: account.avatar
    }
  };
};
const tokenRequest = async (params: Record<string, string>, requireRefresh: boolean) => {
  const http = createAuthenticatedAxios({
    baseURL: 'https://auth.buffer.com',
    contentType: 'application/x-www-form-urlencoded',
    timeout: 30_000,
    maxRedirects: 0,
    errorAdapter: safeError
  });
  const response = await http.post('/token', new URLSearchParams(params).toString());
  const validated = z
    .object({
      access_token: z.string().min(1),
      refresh_token: z.string().min(1).optional(),
      expires_in: z.number().finite().positive(),
      token_type: z.string(),
      scope: z.string().optional()
    })
    .safeParse(response.data);
  if (
    !validated.success ||
    validated.data.token_type.toLowerCase() !== 'bearer' ||
    (requireRefresh && !validated.data.refresh_token)
  )
    throw invalid(
      'Buffer returned an invalid OAuth token response. Reconnect instead of retrying a token exchange.'
    );
  const data = validated.data;
  if (!Number.isFinite(new Date(Date.now() + data.expires_in * 1000).getTime()))
    throw invalid(
      'Buffer returned an invalid token expiration. Reconnect instead of retrying the token exchange.'
    );
  credential(data.access_token);
  if (data.refresh_token) credential(data.refresh_token);
  const normalized = normalizeOAuthTokenResponse(data, { providerLabel: 'Buffer' });
  return {
    output: {
      token: normalized.token,
      refreshToken: data.refresh_token,
      expiresAt: getOAuthExpiresAtFromExpiresIn(data.expires_in),
      apiVersion: 'graphql' as const,
      credentialType: 'oauth' as const
    },
    scopes: data.scope?.split(/\s+/).filter(Boolean)
  };
};

export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      apiVersion: z.enum(['legacy', 'graphql']).optional(),
      credentialType: z.enum(['oauth', 'api_key']).optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal API Key',
    key: 'api_key',
    docs: [
      {
        type: 'docs.auth.token',
        name: 'Create a Buffer API key',
        url: 'https://support.buffer.com/en-us/articles/how-to-create-your-buffer-api-key-ShIgYVwM6j'
      }
    ],
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Personal Buffer API key with access to the required account and post operations.'
        )
    }),
    getOutput: async ctx => {
      const output = {
        token: credential(ctx.input.apiKey),
        apiVersion: 'graphql' as const,
        credentialType: 'api_key' as const
      };
      await new Client(output).getUser();
      return { output };
    },
    getProfile: (ctx: { output: BufferAuth }) => profile(ctx.output)
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.buffer.com/guides/authentication.html'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.buffer.com/guides/authentication.html#scopes'
      }
    ],
    scopes: [
      {
        title: 'Read Account',
        description: 'Read the connected account, organizations and channels.',
        scope: 'account:read'
      },
      {
        title: 'Read Posts',
        description: 'Read posts and posting schedules.',
        scope: 'posts:read'
      },
      {
        title: 'Write Posts',
        description: 'Create, edit, delete and publish posts.',
        scope: 'posts:write'
      },
      {
        title: 'Offline Access',
        description: 'Refresh this connection without signing in again.',
        scope: 'offline_access'
      }
    ],
    getAuthorizationUrl: async ctx => {
      const verifier = randomBytes(32).toString('base64url');
      const challenge = createHash('sha256').update(verifier).digest('base64url');
      const params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        code_challenge: challenge,
        code_challenge_method: 'S256'
      });
      return {
        url: `https://auth.buffer.com/auth?${params}`,
        callbackState: { verifier, state: ctx.state }
      };
    },
    handleCallback: async ctx => {
      const state = z
        .object({
          verifier: z.string().regex(/^[A-Za-z0-9_-]{43,128}$/),
          state: z.string().min(1)
        })
        .safeParse(ctx.callbackState);
      if (!state.success || state.data.state !== ctx.state)
        throw invalid(
          'The Buffer authorization state is invalid or expired. Start a new connection.'
        );
      return tokenRequest(
        {
          client_id: ctx.clientId,
          ...(ctx.clientSecret ? { client_secret: ctx.clientSecret } : {}),
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          code_verifier: state.data.verifier
        },
        ctx.scopes.includes('offline_access')
      );
    },
    handleTokenRefresh: async (ctx: {
      output: BufferAuth;
      clientId: string;
      clientSecret: string;
    }) => {
      if (ctx.output.apiVersion !== 'graphql' || !ctx.output.refreshToken)
        throw invalid(
          'This legacy Buffer connection cannot be refreshed through the current OAuth server. Reconnect to migrate it.'
        );
      credential(ctx.output.refreshToken);
      const result = await tokenRequest(
        {
          client_id: ctx.clientId,
          ...(ctx.clientSecret ? { client_secret: ctx.clientSecret } : {}),
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        },
        true
      );
      return { output: result.output };
    },
    getProfile: (ctx: { output: BufferAuth }) => profile(ctx.output)
  });
