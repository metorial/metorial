import { createAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { RipplingClient } from './lib/client';
import { apiFailure, invalid, required, response, safeResponse } from './lib/validation';

const appName = z
  .string()
  .trim()
  .min(1)
  .regex(/^[A-Za-z0-9_-]+$/);
const authOutput = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  authMethod: z.enum(['oauth', 'api_token']).optional(),
  appName: z.string().optional()
});
async function tokenRequest(
  clientId: string,
  clientSecret: string,
  params: Record<string, string>,
  previousRefreshToken?: string
) {
  const client = createAxios({
    baseURL: 'https://api.rippling.com',
    timeout: 30000,
    maxRedirects: 0
  });
  let value: unknown;
  required(clientSecret, 'OAuth client secret');
  required(clientId, 'OAuth client ID');
  const secret = clientSecret;
  const credentials = Buffer.from(`${clientId}:${secret}`, 'utf8').toString('base64');
  try {
    value = (
      await client.post('/api/o/token/', new URLSearchParams(params).toString(), {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        }
      })
    ).data;
  } catch (error) {
    apiFailure(error);
  }
  const parsed = response(
    z.object({
      access_token: z.string().min(1),
      refresh_token: z.string().min(1).optional(),
      expires_in: z.number().int().positive().max(315360000),
      token_type: z.string().optional()
    }),
    value
  );
  if (parsed.token_type !== undefined && parsed.token_type.toLowerCase() !== 'bearer')
    throw invalid('Rippling did not return a Bearer access token.');
  required(parsed.access_token, 'returned access token');
  if (
    /\s/.test(parsed.access_token) ||
    (parsed.refresh_token !== undefined && /\s/.test(parsed.refresh_token))
  )
    throw invalid('Rippling returned an invalid token.');
  return normalizeOAuthTokenResponse(parsed, {
    providerLabel: 'Rippling',
    required: true,
    expiresInType: 'number',
    previousRefreshToken
  });
}
async function profile(token: string) {
  const company = await new RipplingClient({ token }).getCompany();
  return { profile: { id: company.id, name: company.name ?? company.id } };
}
export const auth = SlateAuth.create()
  .output(authOutput)
  .addOauth({
    type: 'auth.oauth',
    name: 'v1 Partner OAuth',
    key: 'oauth',
    inputSchema: z.object({
      appName: appName
        .optional()
        .describe(
          'App name in the Rippling App Shop installation URL; required to start partner authorization.'
        )
    }),
    // The app listing must grant these exact documented permissions for the retained tools.
    scopes: [
      { title: 'Company access', scope: 'company' },
      { title: 'Employee access', scope: 'employee' },
      { title: 'Company information', scope: 'company:read' },
      { title: 'Employee information', scope: 'employee:read' },
      { title: 'Company departments', scope: 'company:departments:read' },
      { title: 'Company levels', scope: 'company:levels:read' },
      { title: 'Company work locations', scope: 'company:workLocations:read' },
      { title: 'Company custom fields', scope: 'company:customFields:read' },
      { title: 'Company teams', scope: 'company:teams:read' },
      { title: 'Company leave requests', scope: 'company:leave_requests:read' },
      { title: 'Process leave requests', scope: 'company:leave_requests:write' },
      { title: 'Company leave types', scope: 'company:company_leave_types' },
      { title: 'Read app groups', scope: 'groups:read' },
      { title: 'Manage app groups', scope: 'groups:write' },
      { title: 'Read app group members', scope: 'group_members:read' },
      { title: 'Manage app group members', scope: 'group_members:write' },
      { title: 'App SAML metadata', scope: 'saml:idp_metadata' },
      { title: 'Company address', scope: 'company:address:read' },
      { title: 'Company phone', scope: 'company:phone:read' },
      { title: 'Employee name', scope: 'employee:name:read' },
      { title: 'Work email', scope: 'employee:workEmail:read' },
      { title: 'Employment type', scope: 'employee:employmentType:read' },
      { title: 'Job title', scope: 'employee:title:read' },
      { title: 'Department', scope: 'employee:department:read' },
      { title: 'End date', scope: 'employee:endDate:read' },
      { title: 'Employment status', scope: 'employee:roleState:read' },
      { title: 'Manager status', scope: 'employee:isManager:read' },
      { title: 'Employee work location', scope: 'employee:workLocation:read' },
      { title: 'Employee custom fields', scope: 'employee:customFields:read' },
      { title: 'Employee profile identifier', scope: 'employee:uniqueId:read' }
    ],
    getAuthorizationUrl: async ctx => {
      const parsed = appName.safeParse(ctx.input.appName);
      if (!parsed.success)
        throw invalid(
          'Provide the app name from the configured v1 App Shop installation URL.'
        );
      required(ctx.state, 'OAuth state');
      const params = new URLSearchParams({
        state: ctx.state,
        redirect_uri: ctx.redirectUri,
        client_id: ctx.clientId
      });
      return {
        url: `https://app.rippling.com/apps/PLATFORM/${encodeURIComponent(parsed.data)}/authorize?${params}`,
        callbackState: { appName: parsed.data }
      };
    },
    handleCallback: async ctx => {
      const parsed = appName.safeParse(ctx.input.appName ?? ctx.callbackState?.appName);
      if (!parsed.success)
        throw invalid('Restart authorization with the configured v1 App Shop app name.');
      required(ctx.code, 'OAuth authorization code');
      const output = await tokenRequest(ctx.clientId, ctx.clientSecret, {
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      });
      if (!output.refreshToken)
        throw invalid(
          'Rippling did not return a refresh token; reconnect through the partner installation flow.'
        );
      // Finish the documented partner installation; this registers the app installation, not a personnel operation.
      const client = createAxios({
        baseURL: 'https://api.rippling.com',
        timeout: 30000,
        maxRedirects: 0,
        headers: { Authorization: `Bearer ${output.token}`, Accept: 'application/json' }
      });
      let installed: unknown;
      try {
        installed = (await client.post('/platform/api/mark_app_installed')).data;
      } catch (error) {
        apiFailure(error, true);
      }
      response(
        z.object({ ok: z.literal(true) }),
        safeResponse(installed, [output.token, ctx.clientSecret])
      );
      return { output: { ...output, authMethod: 'oauth' as const, appName: parsed.data } };
    },
    handleTokenRefresh: async (ctx: {
      output: z.infer<typeof authOutput>;
      clientId: string;
      clientSecret: string;
    }) => {
      const refreshToken = ctx.output.refreshToken;
      required(refreshToken, 'refresh token; reconnect if unavailable');
      if (!refreshToken || /\s/.test(refreshToken))
        throw invalid('Reconnect with a valid refresh token without whitespace.');
      const output = await tokenRequest(
        ctx.clientId,
        ctx.clientSecret,
        { grant_type: 'refresh_token', refresh_token: refreshToken },
        refreshToken
      );
      return {
        output: { ...output, authMethod: 'oauth' as const, appName: ctx.output.appName }
      };
    },
    getProfile: async (ctx: { output: z.infer<typeof authOutput> }) =>
      profile(ctx.output.token)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'v1 Customer API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'Customer API token authorized for the v1 platform API. New v2 Developer app tokens use different contracts.'
        )
    }),
    getOutput: async ctx => {
      const token = ctx.input.apiToken;
      required(token, 'v1 customer API token');
      if (/\s/.test(token)) throw invalid('Provide an API token without whitespace.');
      return { output: { token, authMethod: 'api_token' as const } };
    },
    getProfile: async (ctx: { output: z.infer<typeof authOutput> }) =>
      profile(ctx.output.token)
  });
