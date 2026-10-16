import {
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { linkhutApiError } from './lib/errors';

let exchangeTokens = async (
  params: Record<string, string>,
  previous?: { token: string; refreshToken?: string; scope?: string }
) => {
  let client = createAuthenticatedAxios({
    baseURL: 'https://api.ln.ht/v1',
    contentType: 'application/x-www-form-urlencoded',
    headers: { Accept: 'application/json' },
    timeout: 30000,
    errorAdapter: error =>
      linkhutApiError(
        error,
        [
          params.client_secret ?? '',
          params.code ?? '',
          params.refresh_token ?? '',
          previous?.token ?? ''
        ],
        'OAuth token exchange'
      )
  });
  let response = await client.post<unknown>(
    '/oauth/token',
    new URLSearchParams(params).toString()
  );
  let data = response.data;
  if (
    !isApiErrorRecord(data) ||
    typeof data.expires_in !== 'number' ||
    !Number.isFinite(data.expires_in) ||
    data.expires_in <= 0 ||
    Date.now() + data.expires_in * 1000 > 8640000000000000
  ) {
    throw createApiServiceError(
      'Linkhut OAuth token response did not include a valid expires_in value.',
      { reason: 'oauth_token_response' }
    );
  }
  if (data.scope !== undefined && typeof data.scope !== 'string') {
    throw createApiServiceError(
      'Linkhut OAuth token response returned an invalid scope value.',
      { reason: 'oauth_token_response' }
    );
  }
  return {
    ...normalizeOAuthTokenResponse(data, {
      providerLabel: 'Linkhut',
      operation: params.grant_type === 'refresh_token' ? 'refresh' : 'token exchange',
      required: true,
      expiresInType: 'number',
      previousRefreshToken: previous?.refreshToken
    }),
    ...(data.scope === undefined
      ? previous?.scope === undefined
        ? {}
        : { scope: previous.scope }
      : { scope: data.scope })
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      scope: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Read Posts',
        description: 'Read access to bookmarks',
        scope: 'posts:read'
      },
      {
        title: 'Write Posts',
        description: 'Create, update, and delete bookmarks',
        scope: 'posts:write'
      },
      {
        title: 'Read Tags',
        description: 'Read access to tags',
        scope: 'tags:read'
      },
      {
        title: 'Write Tags',
        description: 'Delete and rename tags',
        scope: 'tags:write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let scopeString = ctx.scopes.join(' ');
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        scope: scopeString,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://ln.ht/_/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => ({
      output: await exchangeTokens({
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      })
    }),

    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string; scope?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken?.trim()) {
        throw createApiServiceError(
          'This Linkhut connection has no refresh token. Reconnect to renew access.'
        );
      }
      return {
        output: {
          ...ctx.output,
          ...(await exchangeTokens(
            {
              grant_type: 'refresh_token',
              client_id: ctx.clientId,
              client_secret: ctx.clientSecret,
              refresh_token: ctx.output.refreshToken
            },
            ctx.output
          ))
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Personal access token from https://ln.ht/_/oauth/personal-token')
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('Enter a Linkhut personal access token.');
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
