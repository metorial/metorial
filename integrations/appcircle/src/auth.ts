import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let exchangeToken = async (
  authBaseUrl: string,
  path: string,
  parameters: Record<string, string>
) => {
  let baseUrl: URL;
  try {
    baseUrl = new URL(authBaseUrl);
  } catch {
    throw createApiServiceError('Provide a valid Appcircle authentication base URL.');
  }
  if (!['https:', 'http:'].includes(baseUrl.protocol)) {
    throw createApiServiceError(
      'The Appcircle authentication base URL must use HTTP or HTTPS.'
    );
  }
  for (let [key, value] of Object.entries(parameters)) {
    if (!value.trim()) throw createApiServiceError(`${key} must not be empty.`);
  }
  let http = createAuthenticatedAxios({
    baseURL: authBaseUrl.replace(/\/+$/, ''),
    contentType: 'application/x-www-form-urlencoded',
    headers: { Accept: 'application/json' },
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Appcircle',
        reason: 'appcircle_auth_error'
      })
  });
  let response = await http.post(path, new URLSearchParams(parameters).toString());
  let token = normalizeOAuthTokenResponse(response.data, { providerLabel: 'Appcircle' });
  return { token: token.token, expiresAt: token.expiresAt, authBaseUrl };
};

let personalAccessToken = (input: { personalAccessKey: string; authBaseUrl: string }) =>
  exchangeToken(input.authBaseUrl, '/auth/v3/token', {
    personalAccessKey: input.personalAccessKey
  });

let apiKeyToken = (input: {
  apiKeyName: string;
  apiKeySecret: string;
  organizationId?: string;
  authBaseUrl: string;
}) =>
  exchangeToken(input.authBaseUrl, '/auth/v1/api-key/token', {
    name: input.apiKeyName,
    secret: input.apiKeySecret,
    ...(input.organizationId !== undefined ? { organizationId: input.organizationId } : {})
  });

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Access token for Appcircle API requests'),
      expiresAt: z.string().optional(),
      authBaseUrl: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Personal Access Key',
    key: 'personal_access_key',
    inputSchema: z.object({
      personalAccessKey: z
        .string()
        .describe(
          'Personal Access Key generated from My Organization > Security in the Appcircle dashboard'
        ),
      authBaseUrl: z
        .string()
        .default('https://auth.appcircle.io')
        .describe('Auth base URL. Change for self-hosted deployments.')
    }),
    getOutput: async ctx => ({ output: await personalAccessToken(ctx.input) }),
    handleTokenRefresh: async (ctx: {
      input: Parameters<typeof personalAccessToken>[0];
      output: { token: string; expiresAt?: string; authBaseUrl?: string };
    }) => ({ output: { ...ctx.output, ...(await personalAccessToken(ctx.input)) } })
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKeyName: z.string().describe('Name of the API Key'),
      apiKeySecret: z.string().describe('Secret of the API Key'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID when requesting an organization-specific token'),
      authBaseUrl: z
        .string()
        .default('https://auth.appcircle.io')
        .describe('Auth base URL. Change for self-hosted deployments.')
    }),
    getOutput: async ctx => ({ output: await apiKeyToken(ctx.input) }),
    handleTokenRefresh: async (ctx: {
      input: Parameters<typeof apiKeyToken>[0];
      output: { token: string; expiresAt?: string; authBaseUrl?: string };
    }) => ({ output: { ...ctx.output, ...(await apiKeyToken(ctx.input)) } })
  });
