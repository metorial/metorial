import {
  createAuthenticatedAxios,
  isApiErrorRecord,
  normalizeOAuthTokenResponse,
  requestAxios,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { listAdministrations } from './lib/administrations';
import {
  fail,
  invalidResponse,
  parseProviderJson,
  safeMoneybirdError,
  validateToken
} from './lib/validation';

const profile = async (token: string) => {
  const administrations = await listAdministrations(token);
  const first = administrations[0];
  return { profile: first ? { id: first.administrationId, name: first.name } : {} };
};
const exchange = async (body: Record<string, string>, previousRefreshToken?: string) => {
  const http = createAuthenticatedAxios({
    timeout: 30000,
    maxRedirects: 0,
    contentType: 'application/x-www-form-urlencoded',
    transformResponse: [parseProviderJson],
    errorAdapter: safeMoneybirdError
  });
  const response = await requestAxios(
    'OAuth exchange',
    () => http.post('https://moneybird.com/oauth/token', new URLSearchParams(body).toString()),
    safeMoneybirdError
  );
  if (response.status !== 200 || !isApiErrorRecord(response.data)) throw invalidResponse();
  const data = response.data;
  if (
    data.token_type !== undefined &&
    (typeof data.token_type !== 'string' || data.token_type.toLowerCase() !== 'bearer')
  )
    throw invalidResponse();
  if (
    data.expires_in !== undefined &&
    (!Number.isSafeInteger(data.expires_in) || Number(data.expires_in) <= 0)
  )
    throw invalidResponse();
  if (
    data.refresh_token !== undefined &&
    data.refresh_token !== null &&
    (typeof data.refresh_token !== 'string' || !data.refresh_token.trim())
  )
    throw invalidResponse();
  try {
    const output = normalizeOAuthTokenResponse(data, {
      providerLabel: 'Moneybird',
      previousRefreshToken,
      required: data.expires_in !== undefined,
      expiresInType: 'number'
    });
    validateToken(output.token);
    if (output.refreshToken !== undefined) validateToken(output.refreshToken);
    if (output.expiresAt && !output.refreshToken)
      throw fail('Reconnect to Moneybird: an expiring access token requires a refresh token.');
    return { output };
  } catch (error) {
    throw safeMoneybirdError(error);
  }
};
export const auth = SlateAuth.create()
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
        title: 'Sales Invoices',
        description: 'Access sales and recurring invoices',
        scope: 'sales_invoices'
      },
      { title: 'Estimates', description: 'Access quotes and estimates', scope: 'estimates' },
      {
        title: 'Bank',
        description: 'Read bank transactions and reconcile bookings',
        scope: 'bank'
      },
      {
        title: 'Time Entries',
        description: 'Manage time entries and projects',
        scope: 'time_entries'
      },
      {
        title: 'Settings',
        description: 'Manage products and ledger accounts and read tax rates',
        scope: 'settings'
      }
    ],
    getAuthorizationUrl: async ctx => {
      const params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });
      if (ctx.scopes.length) params.set('scope', ctx.scopes.join(' '));
      return { url: `https://moneybird.com/oauth/authorize?${params.toString()}` };
    },
    handleCallback: async ctx =>
      exchange({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        grant_type: 'authorization_code'
      }),
    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        if (ctx.output.expiresAt)
          throw fail('Reconnect to Moneybird: the required refresh token is missing.');
        validateToken(ctx.output.token);
        return { output: ctx.output };
      }
      return exchange(
        {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken,
          grant_type: 'refresh_token'
        },
        ctx.output.refreshToken
      );
    },
    getProfile: async (ctx: { output: { token: string } }) => profile(ctx.output.token)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal API Token',
    key: 'personal_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Personal bearer token generated at https://moneybird.com/user/applications/new'
        )
    }),
    getOutput: async ctx => {
      validateToken(ctx.input.token);
      return { output: { token: ctx.input.token } };
    },
    getProfile: async (ctx: { output: { token: string } }) => profile(ctx.output.token)
  });
