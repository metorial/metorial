import type { SlateAuthWithOauth, SlateAuthWithToken } from 'slates';
import { createAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { type AuthOutput, baseUrl, Client, type Environment } from './lib/client';
import { apiError, fail, integer, isRecord, record, required } from './lib/validation';

let scopes = [
  'company:read',
  'country:read',
  'form:read',
  'employment:write',
  'timeoff:write',
  'expense:write',
  'incentive:write',
  'offboarding:write',
  'timesheet:write',
  'payslip:read',
  'contract_amendment:read'
].map(scope => ({
  scope,
  title: scope,
  description: `Access required for the corresponding Remote tools (${scope}).`
}));
async function identityOutput(output: AuthOutput): Promise<AuthOutput> {
  let { identity } = await new Client(output).getIdentity();
  return {
    ...output,
    companyId: isRecord(identity.company)
      ? required(identity.company.id, 'Company ID')
      : undefined,
    userId: isRecord(identity.user) ? required(identity.user.id, 'User ID') : undefined
  };
}
async function profile(ctx: { output: AuthOutput }) {
  let { identity, mode } = await new Client(ctx.output).getIdentity();
  return { profile: { ...identity, tokenMode: mode, environment: ctx.output.environment } };
}
function oauth(
  name: string,
  key: string,
  environment: Environment
): SlateAuthWithOauth<Record<string, never>, AuthOutput> {
  async function exchange(
    clientId: string,
    clientSecret: string,
    values: Record<string, string>,
    previous?: AuthOutput
  ) {
    let basic = Buffer.from(
      `${required(clientId, 'Client ID')}:${required(clientSecret, 'Client secret')}`
    ).toString('base64');
    let http = createAxios({ baseURL: baseUrl(environment), timeout: 30000, maxRedirects: 0 });
    let value: unknown;
    try {
      value = (
        await http.post('/auth/oauth2/token', new URLSearchParams(values).toString(), {
          headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      ).data;
    } catch (error) {
      apiError(error, 'OAuth token exchange', [
        clientId,
        clientSecret,
        basic,
        ...Object.values(values)
      ]);
    }
    let data = record(value, 'OAuth token response');
    if (data.expires_in === undefined) data = { ...data, expires_in: 3600 };
    integer(
      data.expires_in,
      'Remote token lifetime',
      1,
      Math.floor((8640000000000000 - Date.now()) / 1000)
    );
    let tokens = normalizeOAuthTokenResponse(data, {
      providerLabel: 'Remote',
      required: true,
      expiresInType: 'number',
      previousRefreshToken: previous?.refreshToken
    });
    if (!tokens.refreshToken)
      fail('Remote did not return a refresh token. Reauthorize the company connection.');
    return identityOutput({ ...previous, ...tokens, environment });
  }
  return {
    type: 'auth.oauth',
    name,
    key,
    scopes,
    async getAuthorizationUrl(ctx) {
      let requested = ctx.scopes.length ? ctx.scopes : scopes.map(scope => scope.scope);
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: requested.join(' ')
      });
      return { url: `${baseUrl(environment)}/auth/oauth2/authorize?${params}` };
    },
    async handleCallback(ctx) {
      return {
        output: await exchange(ctx.clientId, ctx.clientSecret, {
          grant_type: 'authorization_code',
          code: required(ctx.code, 'Authorization code')
        })
      };
    },
    async handleTokenRefresh(ctx) {
      return {
        output: await exchange(
          ctx.clientId,
          ctx.clientSecret,
          {
            grant_type: 'refresh_token',
            refresh_token: required(ctx.output.refreshToken, 'Refresh token')
          },
          ctx.output
        )
      };
    },
    getProfile: profile
  };
}
function token(
  name: string,
  key: string,
  environment: Environment
): SlateAuthWithToken<{ apiToken: string }, AuthOutput> {
  return {
    type: 'auth.token',
    name,
    key,
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          `Customer API token beginning ${environment === 'sandbox' ? 'ra_test_' : 'ra_live_'} for this environment.`
        )
    }),
    async getOutput(ctx) {
      let value = required(ctx.input.apiToken, 'API token');
      if (!value.startsWith(environment === 'sandbox' ? 'ra_test_' : 'ra_live_'))
        fail(
          'Use a Remote customer API token with the prefix matching this environment. OAuth access tokens use the OAuth connection methods.'
        );
      return { output: await identityOutput({ token: value, environment }) };
    },
    getProfile: profile
  };
}
export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      environment: z.enum(['production', 'sandbox']),
      companyId: z.string().optional(),
      userId: z.string().optional()
    })
  )
  .addOauth(oauth('Production', 'oauth_production', 'production'))
  .addOauth(oauth('Sandbox', 'oauth_sandbox', 'sandbox'))
  .addTokenAuth(token('API Token (Production)', 'api_token_production', 'production'))
  .addTokenAuth(token('API Token (Sandbox)', 'api_token_sandbox', 'sandbox'));
