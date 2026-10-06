import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { airbyteError, apiBaseUrl } from './lib/validation';

const exchange = async (input: {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}) => {
  if (!input.clientId.trim() || !input.clientSecret.trim())
    throw createApiServiceError('Provide the Airbyte application client ID and secret.');
  const baseUrl = apiBaseUrl(input.baseUrl);
  const http = createAxios({
    baseURL: baseUrl,
    timeout: 30000,
    maxRedirects: 0,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
  });
  let data: unknown;
  try {
    data = (
      await http.post('/applications/token', {
        'grant-type': 'client_credentials',
        client_id: input.clientId,
        client_secret: input.clientSecret
      })
    ).data;
  } catch (error) {
    throw airbyteError(error, [input.clientSecret]);
  }
  const token = normalizeOAuthTokenResponse(data, { providerLabel: 'Airbyte' });
  if (!token.expiresAt)
    throw createApiServiceError('Airbyte did not return expires_in for the access token.');
  return { token: token.token, expiresAt: token.expiresAt, baseUrl };
};
export let auth = SlateAuth.create()
  .output(
    z.object({ token: z.string(), baseUrl: z.string(), expiresAt: z.string().optional() })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',
    inputSchema: z.object({
      clientId: z
        .string()
        .describe(
          'Client ID from your Airbyte data replication application in User settings > Applications.'
        ),
      clientSecret: z.string().describe('Client secret from that Airbyte application.'),
      baseUrl: z
        .string()
        .default('https://api.airbyte.com/v1')
        .describe(
          'Public data replication API URL: https://api.airbyte.com/v1 for Cloud or <YOUR_AIRBYTE_URL>/api/public/v1 for self-managed. The Configuration API and agent APIs are different products.'
        )
    }),
    getOutput: async ctx => ({ output: await exchange(ctx.input) }),
    handleTokenRefresh: async (ctx: {
      input: { clientId: string; clientSecret: string; baseUrl: string };
    }) => ({ output: await exchange(ctx.input) })
  });
