import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client, identityBase, safeSproutFailure } from './lib/client';

export type AuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  authMethod?: 'oauth' | 'api_token';
};
const exchange = async (
  clientId: string,
  clientSecret: string,
  values: Record<string, string>,
  previousRefreshToken?: string
): Promise<AuthOutput> => {
  try {
    const http = createAxios({ baseURL: identityBase, timeout: 45000, maxRedirects: 0 });
    const response = await http.post('/v1/token', new URLSearchParams(values).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      }
    });
    if (response.status !== 200)
      throw createApiServiceError('OAuth token exchange was not confirmed.', {
        reason: 'invalid_api_response',
        upstreamStatus: response.status
      });
    const result = normalizeOAuthTokenResponse(response.data, {
      providerLabel: 'Sprout Social',
      required: true,
      previousRefreshToken,
      refreshTokenFallbackMode: 'falsy'
    });
    if (
      !result.token.trim() ||
      /[\r\n]/.test(result.token) ||
      !result.expiresAt ||
      Date.parse(result.expiresAt) <= Date.now()
    )
      throw createApiServiceError('OAuth returned an invalid or expired token.', {
        reason: 'invalid_api_response'
      });
    return { ...result, authMethod: 'oauth' };
  } catch (error) {
    throw safeSproutFailure(error);
  }
};

export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authMethod: z.enum(['oauth', 'api_token']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    scopes: [
      {
        title: 'OpenID',
        description: 'Read the authenticated user identity.',
        scope: 'openid'
      },
      { title: 'Profile', description: 'Read the authenticated user name.', scope: 'profile' },
      { title: 'Email', description: 'Read the authenticated user email.', scope: 'email' },
      {
        title: 'Organization',
        description: 'Access authorized Sprout customers through the API.',
        scope: 'organization_id'
      }
    ],
    getAuthorizationUrl: async ctx => ({
      url:
        identityBase +
        '/v1/authorize?' +
        new URLSearchParams({
          response_type: 'code',
          client_id: ctx.clientId,
          redirect_uri: ctx.redirectUri,
          state: ctx.state,
          scope: ctx.scopes.join(' ')
        })
    }),
    handleCallback: async ctx => ({
      output: await exchange(ctx.clientId, ctx.clientSecret, {
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      })
    }),
    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      clientId: string;
      clientSecret: string;
      scopes: string[];
    }) => {
      if (!ctx.output.refreshToken?.trim())
        throw createApiServiceError(
          'No refresh token is available. Reconnect with user-based OAuth; refresh-token issuance depends on the OAuth client configuration.',
          { reason: 'missing_refresh_token' }
        );
      return {
        output: await exchange(
          ctx.clientId,
          ctx.clientSecret,
          {
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken,
            scope: ctx.scopes.join(' ')
          },
          ctx.output.refreshToken
        )
      };
    },
    getProfile: async (ctx: { output: AuthOutput }) => {
      const user = await new Client(ctx.output).getCurrentUser();
      return {
        profile: {
          id: user.sub,
          email: user.email ?? undefined,
          name: [user.given_name, user.family_name].filter(Boolean).join(' ') || undefined
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'Personal API token from Settings > Global Features > API > API Token Management. API access requires the appropriate plan and API permissions.'
        )
    }),
    getOutput: async ctx => {
      const output: AuthOutput = { token: ctx.input.apiToken.trim(), authMethod: 'api_token' };
      await new Client(output).listCustomers();
      return { output };
    }
  });
