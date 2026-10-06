import {
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  requestAxios,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import {
  type BambooAuth,
  credential,
  domain,
  invalid,
  row,
  safeApiError,
  text
} from './lib/contracts';

const tokenHttp = (companyDomain: string) =>
  createAuthenticatedAxios({
    baseURL: `https://${domain(companyDomain)}.bamboohr.com`,
    timeout: 30_000,
    maxRedirects: 0,
    errorAdapter: safeApiError
  });
const tokenOutput = (
  value: unknown,
  companyDomain: string,
  redirectUri: string,
  previousRefresh?: string
): BambooAuth => {
  const data = row(value);
  credential(data.access_token, 'OAuth access token');
  if (
    data.token_type !== undefined &&
    (typeof data.token_type !== 'string' || data.token_type.toLowerCase() !== 'bearer')
  )
    invalid('BambooHR returned an unsupported OAuth token type.');
  if (
    typeof data.expires_in !== 'number' ||
    !Number.isSafeInteger(data.expires_in) ||
    data.expires_in <= 0 ||
    data.expires_in > 31_536_000
  )
    invalid('BambooHR returned an invalid OAuth expiration. Reconnect the account.');
  if (data.companyDomain !== undefined && domain(data.companyDomain) !== domain(companyDomain))
    invalid('BambooHR returned a different company. Reconnect the intended account.');
  const refreshToken =
    data.refresh_token === undefined
      ? previousRefresh
      : credential(data.refresh_token, 'OAuth refresh token');
  if (refreshToken !== undefined) credential(refreshToken, 'OAuth refresh token');
  return {
    ...normalizeOAuthTokenResponse(data, {
      providerLabel: 'BambooHR',
      required: true,
      expiresInType: 'number'
    }),
    companyDomain: domain(companyDomain),
    isApiKey: false,
    redirectUri,
    refreshToken
  };
};
const profile = async (output: BambooAuth) => {
  const employee = await new Client(output).getEmployee('0', ['firstName', 'lastName']);
  return {
    profile: {
      companyDomain: output.companyDomain,
      employeeId: employee.id,
      employeeBound: employee.id !== '0',
      ...(typeof employee.firstName === 'string' ? { firstName: employee.firstName } : {}),
      ...(typeof employee.lastName === 'string' ? { lastName: employee.lastName } : {})
    }
  };
};
const scopeResources = [
  ['employee', 'Employee records'],
  ['employee_directory', 'Employee directory'],
  ['field', 'Field and table metadata'],
  ['report', 'Reports'],
  ['goal', 'Goals'],
  ['time_off', 'Time off'],
  ['time_tracking', 'Time tracking'],
  ['training', 'Training'],
  ['benefit', 'Benefit plans'],
  ['employee:dependent', 'Selected employee dependents'],
  ['employee:file', 'Employee files'],
  ['company_file', 'Company files'],
  ['hiring:applications', 'Job applications'],
  ['user', 'Account users']
] as const;
const writableScopes: readonly string[] = [
  'employee',
  'goal',
  'time_off',
  'time_tracking',
  'training',
  'employee:file',
  'company_file',
  'hiring:applications'
];
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      companyDomain: z.string(),
      isApiKey: z.boolean().optional(),
      basicAuthorization: z.string().optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      redirectUri: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth2',
    scopes: [
      {
        title: 'Offline access',
        description: 'Refresh the connection',
        scope: 'offline_access'
      },
      { title: 'OpenID', description: 'Authenticate the connection', scope: 'openid' },
      ...scopeResources.flatMap(([scope, title]) => [
        { title: `${title} read`, scope },
        ...(writableScopes.includes(scope)
          ? [{ title: `${title} write`, scope: `${scope}.write` }]
          : [])
      ])
    ],
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Authentication documentation',
        url: 'https://documentation.bamboohr.com/docs/getting-started'
      }
    ],
    inputSchema: z.object({
      companyDomain: z.string().describe('Company subdomain, without a URL or path')
    }),
    getAuthorizationUrl: async ctx => ({
      url: `https://${domain(ctx.input.companyDomain)}.bamboohr.com/authorize.php?${new URLSearchParams({ request: 'authorize', response_type: 'code', state: ctx.state, scope: ctx.scopes.join(' '), client_id: ctx.clientId, redirect_uri: ctx.redirectUri })}`,
      input: { companyDomain: domain(ctx.input.companyDomain) }
    }),
    handleCallback: async ctx => {
      const response = await requestAxios(
        'OAuth token exchange',
        () =>
          tokenHttp(ctx.input.companyDomain).post<unknown>(
            '/token.php?request=token',
            new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: ctx.clientId,
              client_secret: ctx.clientSecret,
              code: ctx.code,
              redirect_uri: ctx.redirectUri
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          ),
        safeApiError
      );
      if (response.status !== 200)
        throw safeApiError({ response: { status: response.status } });
      return {
        output: tokenOutput(response.data, ctx.input.companyDomain, ctx.redirectUri),
        input: ctx.input
      };
    },
    handleTokenRefresh: async (ctx: {
      output: BambooAuth;
      input: { companyDomain: string };
      clientId: string;
      clientSecret: string;
    }) => {
      const refreshToken = credential(ctx.output.refreshToken, 'Stored refresh token');
      const redirectUri = text(
        ctx.output.redirectUri,
        'Stored OAuth redirect URI; reconnect older OAuth connections'
      );
      const response = await requestAxios(
        'OAuth token refresh',
        () =>
          tokenHttp(ctx.output.companyDomain).post<unknown>(
            '/token.php?request=token',
            new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: ctx.clientId,
              client_secret: ctx.clientSecret,
              refresh_token: refreshToken,
              redirect_uri: redirectUri
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          ),
        safeApiError
      );
      if (response.status !== 200)
        throw safeApiError({ response: { status: response.status } });
      return {
        output: tokenOutput(
          response.data,
          ctx.output.companyDomain,
          redirectUri,
          refreshToken
        ),
        input: { companyDomain: domain(ctx.output.companyDomain) }
      };
    },
    getProfile: (ctx: { output: BambooAuth }) => profile(ctx.output)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Your BambooHR API key'),
      companyDomain: z.string().describe('Company subdomain, without a URL or path')
    }),
    getOutput: async ctx => {
      const token = credential(ctx.input.apiKey, 'API key');
      if (token.includes(':')) invalid('API key contains unsupported characters.');
      return {
        output: {
          token,
          companyDomain: domain(ctx.input.companyDomain),
          isApiKey: true,
          basicAuthorization: `Basic ${Buffer.from(`${token}:x`).toString('base64')}`
        }
      };
    },
    getProfile: (ctx: { output: BambooAuth }) => profile(ctx.output)
  });
