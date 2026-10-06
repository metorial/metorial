import { createHash } from 'node:crypto';
import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { httpClient } from './lib/http';
import { credential, identifier, record, region, upstream, whole } from './lib/validation';

const regionInput = z
  .enum(['us', 'eu', 'in'])
  .optional()
  .describe('Region of the intended JumpCloud account; defaults to US.');
const orgInput = z
  .string()
  .optional()
  .describe(
    'Fix this connection to an authorized organization ID. Omit for permitted organization discovery.'
  );
const outputSchema = z.object({
  token: z.string().describe('JumpCloud API key or OAuth access token'),
  authType: z.enum(['api_key', 'service_account', 'legacy_service_account']).optional(),
  region: z.enum(['us', 'eu', 'in']).optional(),
  orgId: z.string().optional(),
  clientId: z.string().optional(),
  grantMode: z.enum(['administrator', 'legacy']).optional(),
  expiresAt: z.string().optional(),
  credentialBinding: z.string().optional()
});
export type JumpCloudAuth = z.infer<typeof outputSchema>;
const accountInput = z.object({
  clientId: z.string().describe('Service account client ID'),
  clientSecret: z.string().describe('Service account client secret'),
  grantMode: z
    .enum(['administrator', 'legacy'])
    .optional()
    .describe(
      'Choose administrator for the documented API service account grant. Absence preserves the historical unverified legacy grant; it does not migrate existing connections.'
    ),
  region: regionInput,
  orgId: orgInput
});
type AccountInput = z.infer<typeof accountInput>;
function binding(input: AccountInput) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        input.clientId,
        input.clientSecret,
        input.grantMode ?? 'legacy',
        region(input.region),
        input.orgId ?? null
      ])
    )
    .digest('hex');
}
async function mint(input: AccountInput): Promise<JumpCloudAuth> {
  credential(input.clientId, 'Client ID');
  credential(input.clientSecret, 'Client secret');
  if (input.clientId.includes(':'))
    throw createApiServiceError('Client ID cannot contain the Basic authorization separator.');
  if (input.orgId !== undefined) identifier(input.orgId, 'Organization ID');
  const selectedRegion = region(input.region),
    mode = input.grantMode ?? 'legacy';
  if (selectedRegion !== 'us')
    throw createApiServiceError(
      'Only the US service account grant endpoint is documented here. Use a regional API key for EU or India, or reconnect to the verified US account.'
    );
  const authorization = `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`, 'utf8').toString('base64')}`;
  const client = httpClient({
    authorization,
    secrets: [input.clientId, input.clientSecret, authorization]
  });
  try {
    const response = await client.post<unknown>(
      mode === 'administrator'
        ? 'https://admin-oauth.id.jumpcloud.com/oauth2/token'
        : 'https://oauth.id.jumpcloud.com/oauth2/token',
      mode === 'administrator'
        ? 'scope=api&grant_type=client_credentials'
        : 'grant_type=client_credentials&scope=',
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    if (response.status !== 200)
      throw createApiServiceError(
        'JumpCloud returned an unexpected grant status; reconnect without automatically retrying.'
      );
    const data = record(response.data, 'token grant');
    credential(data.access_token, 'Native access token');
    let expiresAt: string | undefined;
    if (mode === 'administrator') {
      if (
        typeof data.token_type !== 'string' ||
        data.token_type.toLowerCase() !== 'bearer' ||
        data.scope !== 'api'
      )
        throw createApiServiceError(
          'The administrator grant did not return the documented Bearer API scope. Reconnect to the intended service account.'
        );
      whole(data.expires_in, 1, 86400, 'Native token lifetime');
      expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    }
    return {
      token: data.access_token,
      authType: mode === 'administrator' ? 'service_account' : 'legacy_service_account',
      grantMode: mode,
      region: selectedRegion,
      orgId: input.orgId,
      clientId: input.clientId,
      expiresAt,
      credentialBinding: binding(input)
    };
  } catch (error) {
    throw upstream(error);
  }
}
async function profile(output: JumpCloudAuth, config: Record<string, unknown> = {}) {
  const fixed = output.orgId ?? config.orgId;
  if (fixed !== undefined) identifier(fixed, 'Organization ID');
  const client = new Client({ ...output, orgId: fixed });
  try {
    if (fixed) {
      const org = await client.getOrganization(fixed);
      return {
        profile: {
          id: org._id,
          name: org.displayName,
          organizationId: org._id,
          region: region(output.region),
          accountType: output.authType ?? 'api_key'
        }
      };
    }
    const page = await client.listOrganizations({ limit: 1 });
    const only = page.totalCount === 1 ? page.results[0] : undefined;
    return {
      profile: {
        ...(only
          ? { id: only._id, organizationId: only._id, name: only.displayName }
          : { name: 'JumpCloud authorized organization access' }),
        organizationCount: page.totalCount,
        region: region(output.region),
        accountType: output.authType ?? 'api_key'
      }
    };
  } catch (error) {
    throw upstream(error);
  }
}
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Admin API key from the intended regional account.'),
      region: regionInput,
      orgId: orgInput
    }),
    getOutput: async ({ input }) => {
      credential(input.apiKey);
      if (input.orgId !== undefined) identifier(input.orgId, 'Organization ID');
      return {
        output: {
          token: input.apiKey,
          authType: 'api_key' as const,
          region: region(input.region),
          orgId: input.orgId
        }
      };
    },
    getProfile: async (ctx: { output: JumpCloudAuth; config?: Record<string, unknown> }) =>
      profile(ctx.output, ctx.config)
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Service Account (Client Credentials)',
    key: 'service_account',
    inputSchema: accountInput,
    getOutput: async ({ input }) => ({ output: await mint(input) }),
    handleTokenRefresh: async ({
      input,
      output
    }: {
      input: AccountInput;
      output: JumpCloudAuth;
    }) => {
      if (
        output.authType !== 'service_account' ||
        output.grantMode !== 'administrator' ||
        input.grantMode !== 'administrator' ||
        output.clientId !== input.clientId ||
        output.region !== region(input.region) ||
        output.orgId !== input.orgId ||
        output.credentialBinding !== binding(input)
      )
        throw createApiServiceError(
          'Renewal must use the original documented administrator client, region, organization and credentials. Reconnect changed or legacy grants explicitly.'
        );
      return { output: await mint(input) };
    },
    getProfile: async (ctx: { output: JumpCloudAuth; config?: Record<string, unknown> }) =>
      profile(ctx.output, ctx.config)
  });
