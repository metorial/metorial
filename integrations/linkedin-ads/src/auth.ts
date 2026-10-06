import {
  createAxios,
  normalizeOAuthTokenResponse,
  requestAxios,
  SlateAuth,
  type SlateAuthWithOauth
} from 'slates';
import { z } from 'zod';
import { apiError, Client, invalid } from './lib/client';

const outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  refreshExpiresAt: z.string().optional()
});
type Output = z.infer<typeof outputSchema>;
const tokenSchema = z.object({
  access_token: z
    .string()
    .min(1)
    .refine(v => !/[\r\n]/.test(v)),
  expires_in: z
    .number()
    .int()
    .positive()
    .max(366 * 86400),
  refresh_token: z
    .string()
    .min(1)
    .refine(v => !/[\r\n]/.test(v))
    .optional(),
  refresh_token_expires_in: z
    .number()
    .int()
    .nonnegative()
    .max(366 * 86400)
    .optional()
});
const exchange = async (
  parameters: Record<string, string>,
  previous?: Output
): Promise<Output> => {
  const http = createAxios({ timeout: 30000, maxRedirects: 0 });
  const response = await requestAxios(
    'OAuth token exchange',
    () =>
      http.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams(parameters).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      ),
    apiError
  );
  const checked = tokenSchema.safeParse(response.data);
  if (!checked.success)
    throw invalid(
      'LinkedIn returned an invalid OAuth token response. Reauthorize the connection.'
    );
  const token = normalizeOAuthTokenResponse(checked.data, {
    providerLabel: 'LinkedIn',
    required: true,
    previousRefreshToken: previous?.refreshToken
  });
  return {
    ...token,
    refreshExpiresAt:
      checked.data.refresh_token_expires_in !== undefined
        ? new Date(Date.now() + checked.data.refresh_token_expires_in * 1000).toISOString()
        : previous?.refreshExpiresAt
  };
};
const method = (
  key: string,
  name: string,
  scopes: string[]
): SlateAuthWithOauth<{}, Output> => ({
  type: 'auth.oauth',
  key,
  name,
  scopes: scopes.map(scope => ({
    scope,
    title: scope,
    description:
      scope === 'rw_conversions'
        ? 'Requires separate Conversions API approval.'
        : scope === 'r_marketing_leadgen_automation'
          ? 'Requires separate Lead Sync API approval.'
          : undefined
  })),
  getAuthorizationUrl: async ctx => ({
    url: `https://www.linkedin.com/oauth/v2/authorization?${new URLSearchParams({ response_type: 'code', client_id: ctx.clientId, redirect_uri: ctx.redirectUri, state: ctx.state, scope: ctx.scopes.join(' ') })}`
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
  handleTokenRefresh: async ctx => {
    if (
      !ctx.output.refreshToken ||
      (ctx.output.refreshExpiresAt && Date.parse(ctx.output.refreshExpiresAt) <= Date.now())
    )
      throw invalid(
        'Programmatic refresh is unavailable or expired for this LinkedIn connection. Reauthorize; approved Marketing partners may receive refresh tokens.'
      );
    return {
      output: await exchange(
        {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        },
        ctx.output
      )
    };
  },
  getProfile: async ctx => {
    const user = await new Client({ token: ctx.output.token }).getCurrentUser();
    return { profile: { id: user.sub, name: user.name, imageUrl: user.picture } };
  }
});
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth(
    method('linkedin_oauth', 'LinkedIn Advertising', [
      'rw_ads',
      'r_ads_reporting',
      'openid',
      'profile'
    ])
  )
  .addOauth(
    method('linkedin_readonly_oauth', 'LinkedIn Advertising Read Only', [
      'r_ads',
      'r_ads_reporting',
      'openid',
      'profile'
    ])
  )
  .addOauth(
    method('linkedin_conversions_oauth', 'LinkedIn Advertising and Conversions', [
      'rw_ads',
      'r_ads_reporting',
      'rw_conversions',
      'openid',
      'profile'
    ])
  )
  .addOauth(
    method('linkedin_leads_oauth', 'LinkedIn Lead Sync', [
      'r_ads',
      'r_marketing_leadgen_automation',
      'openid',
      'profile'
    ])
  );
