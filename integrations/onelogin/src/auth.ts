import { createHash } from 'node:crypto';
import { createApiServiceError, createAuthenticatedAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { parse } from './lib/contracts';
import { CredentialGuard, fail, tenant, text } from './lib/validation';

const inputSchema = z.object({
  clientId: z.string().describe('API credential client ID from the OneLogin admin console'),
  clientSecret: z
    .string()
    .describe(
      'API credential client secret; the granted API scope controls permitted operations'
    ),
  subdomain: z
    .string()
    .describe('Tenant subdomain only, such as mycompany for mycompany.onelogin.com')
});
const outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  subdomain: z.string().optional(),
  accountId: z.number().int().positive().optional(),
  clientId: z.string().optional(),
  credentialBinding: z.string().optional(),
  authVersion: z.literal('client-credentials-v2').optional()
});
type Input = z.infer<typeof inputSchema>;
type Output = z.infer<typeof outputSchema>;
const binding = (input: Input) =>
  createHash('sha256')
    .update(JSON.stringify([tenant(input.subdomain), input.clientId, input.clientSecret]))
    .digest('hex');

async function issue(input: Input, previous?: Output): Promise<Output> {
  const subdomain = tenant(input.subdomain);
  const clientId = text(input.clientId, 'API client ID');
  const clientSecret = text(input.clientSecret, 'API client secret');
  if (clientId.includes(':') || /[\r\n]/.test(clientId + clientSecret))
    fail('Use the exact API credential pair without control characters.');
  const credentialBinding = binding(input);
  if (
    previous &&
    (previous.authVersion !== 'client-credentials-v2' ||
      previous.subdomain !== subdomain ||
      previous.clientId !== clientId ||
      previous.credentialBinding !== credentialBinding)
  ) {
    fail(
      'Reconnect using the original OneLogin tenant and API credential pair. This legacy or changed connection cannot be safely renewed.'
    );
  }
  const payload = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const guard = new CredentialGuard([clientId, clientSecret, payload]);
  const axios = createAuthenticatedAxios({
    baseURL: `https://${subdomain}.onelogin.com`,
    authHeader: { value: `Basic ${payload}` },
    timeout: 30_000,
    maxRedirects: 0,
    validateStatus: () => true
  });
  let response: Awaited<ReturnType<typeof axios.post<unknown>>>;
  try {
    response = await axios.post<unknown>('/auth/oauth2/v2/token', {
      grant_type: 'client_credentials'
    });
  } catch {
    throw createApiServiceError(
      'OneLogin token generation failed. Check the tenant subdomain and original API credentials.'
    );
  }
  guard.check([response.data, response.headers]);
  if (response.status !== 200)
    throw createApiServiceError(
      'OneLogin did not issue a token. Check the API credential pair and its scope.',
      { upstreamStatus: response.status }
    );
  const data = parse(
    z
      .object({
        access_token: z.string().min(1),
        refresh_token: z.string().min(1).optional(),
        created_at: z.string(),
        expires_in: z.number().int().positive(),
        token_type: z.string(),
        account_id: z.number().int().positive()
      })
      .passthrough(),
    response.data
  );
  if (data.token_type.toLowerCase() !== 'bearer' || /\s/.test(data.access_token))
    fail('OneLogin returned an unsupported access token type.');
  const createdAt = Date.parse(data.created_at);
  const expiresAt = createdAt + data.expires_in * 1000;
  if (
    !Number.isFinite(createdAt) ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Date.now()
  )
    fail(
      'OneLogin returned an invalid or already expired token lifetime. Reconnect before invoking tools.'
    );
  if (previous?.accountId !== undefined && data.account_id !== previous.accountId)
    fail(
      'OneLogin returned a token for a different account. Reconnect to the original account.'
    );
  return {
    token: data.access_token,
    refreshToken: data.refresh_token ?? previous?.refreshToken,
    expiresAt: new Date(expiresAt).toISOString(),
    subdomain,
    accountId: data.account_id,
    clientId,
    credentialBinding,
    authVersion: 'client-credentials-v2'
  };
}

export const auth = SlateAuth.create()
  .output(outputSchema)
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',
    inputSchema,
    getOutput: async ctx => ({ output: await issue(ctx.input) }),
    handleTokenRefresh: async (ctx: { input: Input; output: Output }) => ({
      output: await issue(ctx.input, ctx.output)
    })
  });
