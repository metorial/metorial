import {
  AuthConfigSecretRedactor,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from './lib/client';
import type { FreshBooksAuth } from './lib/contracts';
import { invalid, ORIGIN, row, safeApiError, text } from './lib/contracts';

const tokenHttp = () =>
  createAuthenticatedAxios({
    baseURL: ORIGIN,
    timeout: 30_000,
    maxRedirects: 0,
    errorAdapter: safeApiError
  });
const tokenOutput = (value: unknown, redirectUri: string) => {
  const data = row(value);
  text(data.access_token, 'OAuth access token');
  text(data.refresh_token, 'OAuth rotating refresh token');
  if (
    typeof data.expires_in !== 'number' ||
    !Number.isSafeInteger(data.expires_in) ||
    data.expires_in <= 0 ||
    data.expires_in > 31_536_000
  )
    invalid('FreshBooks returned an invalid OAuth expiration. Reconnect the account.');
  if (
    data.token_type !== undefined &&
    (typeof data.token_type !== 'string' || data.token_type.toLowerCase() !== 'bearer')
  )
    invalid('FreshBooks returned an unsupported OAuth token type.');
  return {
    ...normalizeOAuthTokenResponse(data, {
      providerLabel: 'FreshBooks',
      required: true,
      expiresInType: 'number'
    }),
    redirectUri
  };
};
const scopeResources = [
  ['clients', 'Clients'],
  ['invoices', 'Invoices'],
  ['payments', 'Payments'],
  ['estimates', 'Estimates'],
  ['expenses', 'Expenses'],
  ['time_entries', 'Time Entries'],
  ['projects', 'Projects'],
  ['taxes', 'Taxes'],
  ['billable_items', 'Billable Items'],
  ['credit_notes', 'Credit Notes']
] as const;
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      redirectUri: z.string().optional()
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
        url: 'https://www.freshbooks.com/api/authentication'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://www.freshbooks.com/api/scopes'
      }
    ],
    scopes: [
      {
        title: 'Profile Read',
        description: 'Discover your identity and authorized account/business memberships',
        scope: 'user:profile:read'
      },
      ...scopeResources.flatMap(([key, name]) => [
        {
          title: `${name} Read`,
          description: `Read ${name.toLowerCase()}`,
          scope: `user:${key}:read`
        },
        {
          title: `${name} Write`,
          description: `Create and update ${name.toLowerCase()}`,
          scope: `user:${key}:write`
        }
      ])
    ],
    getAuthorizationUrl: async ctx => ({
      url: `https://auth.freshbooks.com/oauth/authorize/?${new URLSearchParams({ response_type: 'code', client_id: ctx.clientId, redirect_uri: ctx.redirectUri, state: ctx.state, scope: ctx.scopes.join(' ') })}`
    }),
    handleCallback: async ctx => {
      const response = await tokenHttp().post('/auth/oauth/token', {
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      });
      return { output: tokenOutput(response.data, ctx.redirectUri) };
    },
    handleTokenRefresh: async (ctx: {
      output: FreshBooksAuth;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken || !ctx.output.redirectUri)
        invalid(
          'Reconnect FreshBooks to save a rotating refresh token and the original redirect URI.'
        );
      const response = await tokenHttp().post('/auth/oauth/token', {
        grant_type: 'refresh_token',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: text(ctx.output.refreshToken, 'Refresh token'),
        redirect_uri: text(ctx.output.redirectUri, 'Original redirect URI')
      });
      return { output: tokenOutput(response.data, ctx.output.redirectUri) };
    },
    getProfile: async (ctx: { output: FreshBooksAuth }) => {
      const identity = await new FreshBooksClient(ctx.output).identity();
      const redactor = new AuthConfigSecretRedactor({
        token: ctx.output.token,
        refreshToken: ctx.output.refreshToken
      });
      const name = [identity.firstName, identity.lastName].filter(Boolean).join(' ');
      if (redactor.redactEmbedded(name) !== name)
        invalid('FreshBooks returned an unexpected profile.');
      return {
        profile: {
          id: String(identity.identityId),
          email: identity.email,
          name: name || 'FreshBooks user'
        }
      };
    }
  });
