import { createAuthenticatedAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { apiError, fail, parse, required } from './lib/validation';

const outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional()
});
type AuthOutput = z.infer<typeof outputSchema>;
const authBase = 'https://accounts-api.brex.com/oauth2/default/v1';
const exchange = async (
  params: Record<string, string>,
  previousRefresh?: string
): Promise<AuthOutput> => {
  const client = createAuthenticatedAxios({
    timeout: 30000,
    maxRedirects: 0,
    contentType: 'application/x-www-form-urlencoded',
    errorAdapter: apiError
  });
  const response = await client.post(
    `${authBase}/token`,
    new URLSearchParams(params).toString()
  );
  const value = parse(
    z.object({
      access_token: z.string().min(1),
      refresh_token: z.string().min(1).optional(),
      expires_in: z.number().int().positive().max(31536000).optional(),
      token_type: z.string().optional()
    }),
    response.data
  );
  if (value.token_type && value.token_type.toLowerCase() !== 'bearer')
    fail('Brex returned an unsupported OAuth token type.');
  required(value.access_token, 'Access token');
  return normalizeOAuthTokenResponse(
    { ...value, expires_in: value.expires_in ?? 3600 },
    { providerLabel: 'Brex', previousRefreshToken: previousRefresh, expiresInType: 'number' }
  );
};
const profile = async (output: AuthOutput) => {
  const me = await new Client(output).getUserMe();
  return {
    profile: {
      id: me.id,
      name: [me.first_name, me.last_name].filter(Boolean).join(' ') || me.email || me.id,
      email: me.email ?? undefined
    }
  };
};
const commonScopes = [
  'openid',
  'offline_access',
  'users.readonly',
  'cards.readonly',
  'locations.readonly',
  'departments.readonly',
  'vendors.readonly',
  'transfers.readonly',
  'transactions.card.readonly',
  'transactions.cash.readonly',
  'accounts.card.readonly',
  'accounts.cash.readonly',
  'budgets.readonly',
  'expenses.card.readonly'
];
const writeScopes = [
  'openid',
  'offline_access',
  'users',
  'cards',
  'locations.readonly',
  'departments.readonly',
  'vendors',
  'transfers',
  'transactions.card.readonly',
  'transactions.cash.readonly',
  'accounts.card.readonly',
  'accounts.cash.readonly',
  'budgets',
  'expenses.card'
];
const scopes = (values: string[]) =>
  values.map(scope => ({
    title: scope,
    description: `Access required by the corresponding Brex API: ${scope}.`,
    scope
  }));
const docs = [
  {
    type: 'docs.auth.oauth' as const,
    name: 'Partner authentication',
    url: 'https://developer.brex.com/guides/partner_authentication'
  },
  {
    type: 'docs.auth.oauth_scopes' as const,
    name: 'Roles and scopes',
    url: 'https://developer.brex.com/guides/roles_permissions_scopes'
  }
];
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    docs,
    scopes: scopes(writeScopes),
    getAuthorizationUrl: async ctx => ({
      url: `${authBase}/authorize?${new URLSearchParams({ client_id: ctx.clientId, redirect_uri: ctx.redirectUri, response_type: 'code', state: ctx.state, scope: ctx.scopes.join(' ') })}`
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
    }) => ({
      output: await exchange(
        {
          grant_type: 'refresh_token',
          refresh_token: required(
            ctx.output.refreshToken,
            'OAuth refresh token; reconnect if missing'
          ),
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        },
        ctx.output.refreshToken
      )
    }),
    getProfile: (ctx: { output: AuthOutput }) => profile(ctx.output)
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0 (Read Only)',
    key: 'oauth_readonly',
    docs,
    scopes: scopes(commonScopes),
    getAuthorizationUrl: async ctx => ({
      url: `${authBase}/authorize?${new URLSearchParams({ client_id: ctx.clientId, redirect_uri: ctx.redirectUri, response_type: 'code', state: ctx.state, scope: ctx.scopes.join(' ') })}`
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
    }) => ({
      output: await exchange(
        {
          grant_type: 'refresh_token',
          refresh_token: required(
            ctx.output.refreshToken,
            'OAuth refresh token; reconnect if missing'
          ),
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        },
        ctx.output.refreshToken
      )
    }),
    getProfile: (ctx: { output: AuthOutput }) => profile(ctx.output)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    docs: [
      {
        type: 'docs.auth.token',
        name: 'Developer authentication',
        url: 'https://developer.brex.com/guides/authentication'
      }
    ],
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Developer user token for production. Include users.readonly for identity verification and the scopes required by the selected tools.'
        )
    }),
    getOutput: async ctx => ({ output: { token: required(ctx.input.token, 'Token') } }),
    getProfile: (ctx: { output: AuthOutput }) => profile(ctx.output)
  });
