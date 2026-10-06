import { createAxios, normalizeOAuthTokenResponse, requestAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { credential, invalid, type LeverAuth, row, safeApiError } from './lib/contracts';

// Write scopes include reads. The provider limits partner applications to twenty scopes.
const scopeIds = [
  'offline_access',
  'applications:read:admin',
  'archive_reasons:read:admin',
  'contact:write:admin',
  'feedback:read:admin',
  'feedback_templates:read:admin',
  'files:read:admin',
  'interviews:write:admin',
  'notes:write:admin',
  'offers:read:admin',
  'opportunities:write:admin',
  'panels:read:admin',
  'postings:write:admin',
  'referrals:read:admin',
  'requisitions:write:admin',
  'resumes:read:admin',
  'sources:read:admin',
  'stages:read:admin',
  'tags:read:admin',
  'users:write:admin'
];
const scopes = scopeIds.map(scope => ({
  scope,
  title:
    scope === 'offline_access' ? 'Offline access' : scope.split(':').slice(0, 2).join(' '),
  description:
    scope === 'offline_access'
      ? 'Refresh the connection'
      : `Access ${scope.split(':')[0]} required by the available tools`
}));
const tokenOutput = (
  value: unknown,
  environment: 'production' | 'sandbox',
  previousRefreshToken?: string
) => {
  const data = row(value);
  if (data.token_type !== undefined && data.token_type !== 'Bearer')
    invalid('Lever returned an unsupported OAuth token type. Reconnect the account.');
  const seconds =
    typeof data.expires_in === 'string' ? Number(data.expires_in) : data.expires_in;
  if (
    typeof seconds !== 'number' ||
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    seconds > 31536000
  )
    invalid('Lever returned an invalid OAuth token expiry. Reconnect the account.');
  const normalized = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Lever',
    required: true,
    previousRefreshToken,
    refreshTokenFallbackMode: 'falsy'
  });
  const token = credential(normalized.token, 'OAuth access token');
  const refreshToken = credential(normalized.refreshToken, 'OAuth refresh token');
  return { ...normalized, token, refreshToken, environment, isApiKey: false };
};
function createLeverOauth(name: string, key: string, environment: 'production' | 'sandbox') {
  const authHost =
    environment === 'sandbox' ? 'https://sandbox-lever.auth0.com' : 'https://auth.lever.co';
  const audience =
    environment === 'sandbox'
      ? 'https://api.sandbox.lever.co/v1/'
      : 'https://api.lever.co/v1/';
  const exchange = async (body: Record<string, string>, previousRefreshToken?: string) => {
    const response = await requestAxios(
      'OAuth token exchange',
      () =>
        createAxios({ timeout: 30000, maxRedirects: 0 }).post<unknown>(
          `${authHost}/oauth/token`,
          new URLSearchParams(body).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        ),
      safeApiError
    );
    if (response.status !== 200)
      throw safeApiError({ response: { status: response.status } }, 'OAuth token exchange');
    return tokenOutput(response.data, environment, previousRefreshToken);
  };
  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,
    docs: [
      {
        type: 'docs.auth.oauth' as const,
        name: 'OAuth documentation',
        url: 'https://hire.lever.co/developer/oauth'
      },
      {
        type: 'docs.auth.oauth_scopes' as const,
        name: 'OAuth scopes',
        url: 'https://hire.lever.co/developer/documentation#scopes'
      }
    ],
    getAuthorizationUrl: async (ctx: {
      clientId: string;
      redirectUri: string;
      state: string;
      scopes: string[];
    }) => ({
      url: `${authHost}/authorize?${new URLSearchParams({ client_id: ctx.clientId, redirect_uri: ctx.redirectUri, response_type: 'code', state: ctx.state, audience, scope: (ctx.scopes.length ? ctx.scopes : scopeIds).join(' ') })}`
    }),
    handleCallback: async (ctx: {
      clientId: string;
      clientSecret: string;
      code: string;
      redirectUri: string;
    }) => ({
      output: await exchange({
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: credential(ctx.code, 'OAuth authorization code'),
        redirect_uri: ctx.redirectUri
      })
    }),
    handleTokenRefresh: async (ctx: {
      clientId: string;
      clientSecret: string;
      output: LeverAuth;
    }) => {
      if (
        ctx.output.isApiKey === true ||
        (ctx.output.environment !== undefined && ctx.output.environment !== environment)
      )
        invalid(
          'Stored OAuth connection does not match this authentication method. Reconnect the account.'
        );
      const refreshToken = credential(
        ctx.output.refreshToken,
        'Stored OAuth refresh token; reconnect if missing'
      );
      return {
        output: await exchange(
          {
            grant_type: 'refresh_token',
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            refresh_token: refreshToken
          },
          refreshToken
        )
      };
    }
  };
}
function createLeverApiKey(name: string, key: string, environment: 'production' | 'sandbox') {
  return {
    type: 'auth.token' as const,
    name,
    key,
    inputSchema: z.object({
      apiKey: z.string().describe('Lever API key for this environment')
    }),
    getOutput: async (ctx: { input: { apiKey: string } }) => {
      const token = credential(ctx.input.apiKey, 'API key');
      if (token.includes(':')) invalid('API key must not contain a colon.');
      return {
        output: {
          token,
          environment,
          isApiKey: true,
          basicAuthorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}`
        }
      };
    }
  };
}
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      environment: z.enum(['production', 'sandbox']),
      isApiKey: z.boolean().optional(),
      basicAuthorization: z.string().optional()
    })
  )
  .addOauth(createLeverOauth('Production', 'oauth_production', 'production'))
  .addOauth(createLeverOauth('Sandbox', 'oauth_sandbox', 'sandbox'))
  .addTokenAuth(createLeverApiKey('API Key (Production)', 'api_key_production', 'production'))
  .addTokenAuth(createLeverApiKey('API Key (Sandbox)', 'api_key_sandbox', 'sandbox'));
