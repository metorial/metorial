import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import {
  defaultBaseUrl,
  normalizeBaseUrl,
  type RocketadminAuth,
  RocketadminClient,
  record,
  requiredString
} from './lib/client';

const instanceUrl = z
  .string()
  .optional()
  .describe(
    'Rocketadmin API base URL. Defaults to https://app.rocketadmin.com/api. For self-hosted deployments, include the API path (often /api) or use the direct backend URL; custom paths are preserved.'
  );

function sessionToken(cookies: unknown): string {
  let values = Array.isArray(cookies) ? cookies : [cookies];
  for (let cookie of values) {
    if (typeof cookie !== 'string') continue;
    let match = cookie.match(/(?:^|,\s*)rocketadmin_cookie=([^;]+)/);
    if (match?.[1]) return match[1];
  }
  throw createApiServiceError(
    'Rocketadmin did not return a login session. Check your credentials and instance URL.'
  );
}

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authType: z.enum(['api_key', 'session']).optional(),
      baseUrl: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Rocketadmin API key from Account Settings. Supports connection discovery and table data operations.'
        ),
      instanceUrl
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiKey,
        authType: 'api_key' as const,
        baseUrl: normalizeBaseUrl(ctx.input.instanceUrl ?? defaultBaseUrl)
      }
    }),
    getProfile: async (ctx: { output: RocketadminAuth }) => {
      await new RocketadminClient(ctx.output).checkApiKey();
      return { profile: { name: 'Rocketadmin API Key' } };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Email & Password',
    key: 'email_password',
    inputSchema: z.object({
      email: z.string().describe('Rocketadmin account email address'),
      password: z.string().describe('Rocketadmin account password'),
      companyId: z.string().optional().describe('Company ID to log in to (optional)'),
      instanceUrl,
      otpToken: z
        .string()
        .optional()
        .describe('Current two-factor authentication code, when enabled on this account.')
    }),
    getOutput: async ctx => {
      let baseUrl = normalizeBaseUrl(ctx.input.instanceUrl ?? defaultBaseUrl);
      let axios = createAuthenticatedAxios({
        baseURL: baseUrl,
        timeout: 30_000,
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Rocketadmin',
            reason: 'rocketadmin_auth_error',
            extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
          })
      });
      let response = await axios.post('/user/login/', {
        email: ctx.input.email,
        password: ctx.input.password,
        ...(ctx.input.companyId !== undefined ? { companyId: ctx.input.companyId } : {})
      });
      let token = sessionToken(
        response.headers['set-cookie'] ??
          getResponseHeaderValue(response.headers, 'set-cookie')
      );
      let data = record(response.data, 'login response');
      if (data.isTemporary === true) {
        if (!ctx.input.otpToken)
          throw createApiServiceError(
            'This account requires two-factor authentication. Reconnect with a current otpToken.'
          );
        response = await axios.post(
          '/user/otp/login/',
          { otpToken: ctx.input.otpToken },
          { headers: { Cookie: `rocketadmin_cookie=${token}` } }
        );
        token = sessionToken(response.headers['set-cookie']);
        data = record(response.data, 'two-factor login response');
      }
      if (data.isTemporary !== false)
        throw createApiServiceError('Rocketadmin did not confirm a complete login session.');
      let expiresAt = requiredString(data.expires, 'session expiration');
      if (!Number.isFinite(Date.parse(expiresAt)))
        throw createApiServiceError('Rocketadmin returned an invalid session expiration.');
      return { output: { token, authType: 'session' as const, baseUrl, expiresAt } };
    },
    getProfile: async (ctx: { output: RocketadminAuth }) => {
      let data = await new RocketadminClient(ctx.output).getUserInfo();
      let id = requiredString(data.id, 'user ID');
      let email = requiredString(data.email, 'user email');
      return {
        profile: {
          id,
          email,
          name: typeof data.name === 'string' && data.name ? data.name : email
        }
      };
    }
  });
