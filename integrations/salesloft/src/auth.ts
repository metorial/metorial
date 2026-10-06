import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  requestAxios,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { apiFailure } from './lib/errors';

const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z
    .number()
    .positive()
    .max((8.64e15 - Date.now()) / 1000)
});
const tokenRequest = async (data: Record<string, string>, previousRefreshToken?: string) => {
  const client = createAxios({
    baseURL: 'https://accounts.salesloft.com',
    timeout: 30000,
    maxRedirects: 0,
    validateStatus: () => true
  });
  const response = await requestAxios(
    'Salesloft OAuth exchange',
    () =>
      client.post<unknown>('/oauth/token', data, {
        headers: { 'Content-Type': 'application/json' }
      }),
    error => apiFailure('OAuth exchange', error)
  );
  if (response.status < 200 || response.status >= 300)
    throw apiFailure('OAuth exchange', { response: { status: response.status } });
  const parsed = tokenSchema.safeParse(response.data);
  if (!parsed.success)
    throw createApiServiceError(
      'Salesloft returned an invalid OAuth token response. Reconnect the account.'
    );
  const output = normalizeOAuthTokenResponse(parsed.data, {
    providerLabel: 'Salesloft',
    operation: 'token exchange',
    previousRefreshToken,
    required: true
  });
  if (!output.refreshToken)
    throw createApiServiceError(
      'Salesloft did not return a refresh token. Reconnect the OAuth account.'
    );
  return { output };
};
const getProfile = async (ctx: { output: { token: string } }) => {
  const user = await new Client({ token: ctx.output.token }).getMe();
  return {
    profile: {
      id: String(user.id),
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      firstName: user.first_name ?? undefined,
      lastName: user.last_name ?? undefined
    }
  };
};
const scopes = [
  ['people:read', 'Read People'],
  ['people:write', 'Create and Update People'],
  ['people:delete', 'Delete People'],
  ['accounts:read', 'Read Accounts'],
  ['accounts:write', 'Create and Update Accounts'],
  ['accounts:delete', 'Delete Accounts'],
  ['cadences:read', 'Read Cadences and Memberships'],
  ['cadences:write', 'Enroll People in Cadences'],
  ['cadences:delete', 'Remove Cadence Memberships'],
  ['calls:read', 'Read Call Activities'],
  ['calls:write', 'Log Calls'],
  ['emails:read', 'Read Emails and Templates'],
  ['email_contents:read', 'Read Email Subjects'],
  ['tasks:read', 'Read Tasks'],
  ['notes:read', 'Read Notes'],
  ['notes:write', 'Create and Update Notes'],
  ['notes:delete', 'Delete Notes'],
  ['team:read', 'Read Users']
].map(([scope, title]) => ({ scope: scope!, title: title!, description: title! }));
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
    scopes,
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.salesloft.com/docs/platform/api-basics/oauth-authentication/'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.salesloft.com/docs/platform/api-basics/scopes/'
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
      return { url: `https://accounts.salesloft.com/oauth/authorize?${params}` };
    },
    handleCallback: async ctx =>
      tokenRequest({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        grant_type: 'authorization_code',
        redirect_uri: ctx.redirectUri
      }),
    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken?.trim())
        throw createApiServiceError(
          'The Salesloft OAuth refresh token is missing. Reconnect the account.'
        );
      return tokenRequest(
        {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        },
        ctx.output.refreshToken
      );
    },
    getProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Salesloft API key from the issuing user. Partner applications should use OAuth.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError('A Salesloft API key is required.');
      return { output: { token: ctx.input.apiKey } };
    },
    getProfile
  });
