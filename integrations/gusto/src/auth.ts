import {
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  requestAxiosData,
  SlateAuth,
  type SlateAuthWithOauth
} from 'slates';
import { z } from 'zod';
import { readContext } from './lib/context';
import { BASE_URLS, gustoError } from './lib/helpers';

const authOutput = z.object({
  token: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  environment: z.enum(['production', 'demo']),
  companyId: z.string().optional(),
  redirectUri: z.string().optional()
});
type AuthOutput = z.infer<typeof authOutput>;
const scopeIds = [
  'companies:read',
  'companies:write',
  'employees:read',
  'employees:manage',
  'employees:write',
  'employments:write',
  'contractors:read',
  'contractors:manage',
  'contractors:write',
  'payrolls:read',
  'payrolls:write',
  'payrolls:run',
  'company_benefits:read',
  'company_benefits:write',
  'employee_benefits:read',
  'employee_benefits:write',
  'pay_schedules:read',
  'time_off_policies:read',
  'employee_time_off_activities:read',
  'garnishments:read',
  'garnishments:write',
  'departments:read',
  'departments:write',
  'jobs:read',
  'jobs:write',
  'compensations:read',
  'compensations:write',
  'company_forms:read',
  'employee_forms:read',
  'signatories:read'
];
const scopes = scopeIds.map(scope => ({
  title: scope.replaceAll('_', ' ').replace(':', ' — '),
  scope,
  description: `Provider-approved access for ${scope}. Embedded-only capabilities require an approved Embedded Payroll application.`
}));

const tokenResponse = (data: unknown, previousRefreshToken?: string) => {
  const parsed = z
    .object({
      access_token: z.string().min(1),
      refresh_token: z.string().min(1).optional(),
      expires_in: z.number().positive().max(31536000)
    })
    .safeParse(data);
  if (!parsed.success)
    throw createApiServiceError(
      'Gusto did not return a valid access token and positive expiry. Reconnect the account.',
      { reason: 'oauth_token_response' }
    );
  return normalizeOAuthTokenResponse(parsed.data, {
    providerLabel: 'Gusto',
    required: true,
    previousRefreshToken
  });
};

function createGustoOauth(
  name: string,
  key: string,
  environment: 'production' | 'demo'
): SlateAuthWithOauth<Record<string, never>, AuthOutput> {
  const baseUrl = BASE_URLS[environment];
  const exchange = (data: Record<string, unknown>) => {
    const http = createAuthenticatedAxios({
      baseURL: baseUrl,
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error => gustoError(error, 'OAuth exchange')
    });
    return requestAxiosData(
      'OAuth exchange',
      () => http.post<unknown>('/oauth/token', data),
      gustoError
    );
  };
  return {
    type: 'auth.oauth',
    name,
    key,
    scopes,
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://docs.gusto.com/app-integrations/docs/oauth2'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'Approved API scopes',
        url: 'https://docs.gusto.com/app-integrations/docs/scopes'
      }
    ],
    getAuthorizationUrl: async ctx => ({
      url: `${baseUrl}/oauth/authorize?${new URLSearchParams({ client_id: ctx.clientId, redirect_uri: ctx.redirectUri, response_type: 'code', state: ctx.state })}`
    }),
    handleCallback: async ctx => {
      const tokens = tokenResponse(
        await exchange({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          code: ctx.code,
          grant_type: 'authorization_code'
        })
      );
      const output = { ...tokens, environment, redirectUri: ctx.redirectUri };
      const context = await readContext(output);
      return { output: { ...output, companyId: context.companyId }, scopes: context.scopes };
    },
    handleTokenRefresh: async ctx => {
      if (!ctx.output.refreshToken?.trim())
        throw createApiServiceError(
          'No Gusto refresh token is available. Reconnect the account.',
          { reason: 'missing_refresh_token' }
        );
      if (ctx.output.environment !== environment)
        throw createApiServiceError('Reconnect using the original Gusto environment.', {
          reason: 'environment_mismatch'
        });
      if (!ctx.output.redirectUri?.trim())
        throw createApiServiceError(
          'This Gusto connection is missing its original redirect URI. Reconnect the account before refreshing the token.',
          { reason: 'missing_redirect_uri' }
        );
      const tokens = tokenResponse(
        await exchange({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.output.redirectUri,
          refresh_token: ctx.output.refreshToken,
          grant_type: 'refresh_token'
        }),
        ctx.output.refreshToken
      );
      const output = {
        ...tokens,
        environment,
        companyId: ctx.output.companyId,
        redirectUri: ctx.output.redirectUri
      };
      const context = await readContext(output);
      return { output: { ...output, companyId: context.companyId } };
    },
    getProfile: async ctx => {
      const info = await readContext(ctx.output);
      const identity = info.resourceOwner ?? info.resource;
      if (!identity)
        throw createApiServiceError(
          'Gusto did not expose an identity for this token. Reconnect with a company administrator.',
          { reason: 'missing_token_identity' }
        );
      return {
        profile: { id: identity.uuid, type: identity.type, companyId: info.companyId }
      };
    }
  };
}
export const auth = SlateAuth.create()
  .output(authOutput)
  .addOauth(createGustoOauth('Production', 'oauth_production', 'production'))
  .addOauth(createGustoOauth('Demo', 'oauth_demo', 'demo'));
