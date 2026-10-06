import { createHash } from 'node:crypto';
import { normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { fail, parse, uuid } from './lib/contracts';
import { http, identityHosts, token } from './lib/http';

const inputSchema = z.object({
  clientId: z
    .string()
    .describe(
      'Organization API client ID: organization.<organization UUID>. Personal user keys do not authorize this API.'
    ),
  clientSecret: z
    .string()
    .describe('Organization API client secret from the organization admin console.'),
  identityUrl: z
    .enum(identityHosts)
    .default('https://identity.bitwarden.com')
    .describe('Identity region matching this organization: US or EU cloud.')
});
async function exchange(input: z.infer<typeof inputSchema>) {
  if (!input.clientId.startsWith('organization.'))
    fail('Use an organization API key, not a personal user or Secrets Manager token.');
  const organizationId = uuid(input.clientId.slice('organization.'.length));
  token(input.clientSecret);
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'api.organization',
    client_id: input.clientId,
    client_secret: input.clientSecret
  });
  const response = await http(input.identityUrl, [input.clientSecret]).post(
    '/connect/token',
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  const data = parse(
    z.object({
      access_token: z.string(),
      expires_in: z.number().int().positive(),
      token_type: z.string(),
      scope: z.string().optional()
    }),
    response.data
  );
  if (
    typeof data.expires_in !== 'number' ||
    data.expires_in <= 0 ||
    !Number.isFinite(data.expires_in) ||
    String(data.token_type).toLowerCase() !== 'bearer' ||
    (data.scope !== undefined && data.scope !== 'api.organization')
  )
    fail(
      'Bitwarden returned an invalid organization token lifetime, type or scope; reconnect.'
    );
  if (!Number.isFinite(new Date(Date.now() + data.expires_in * 1000).getTime()))
    fail('The native organization token expiry is not representable.');
  const normalized = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Bitwarden',
    operation: 'client credentials',
    required: true,
    expiresInType: 'number'
  });
  token(normalized.token);
  return {
    credentialFingerprint: createHash('sha256')
      .update(JSON.stringify([input.clientId, input.clientSecret, input.identityUrl]))
      .digest('hex'),
    token: normalized.token,
    expiresAt: normalized.expiresAt!,
    organizationId,
    clientId: input.clientId,
    identityUrl: input.identityUrl,
    serverUrl:
      input.identityUrl === identityHosts[1]
        ? 'https://api.bitwarden.eu'
        : 'https://api.bitwarden.com'
  };
}
const outputSchema = z.object({
  credentialFingerprint: z.string().optional(),
  token: z.string(),
  serverUrl: z.string(),
  expiresAt: z.string().optional(),
  organizationId: z.string().optional(),
  clientId: z.string().optional(),
  identityUrl: z.string().optional()
});
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Organization API Key',
    key: 'organization_api_key',
    inputSchema,
    getOutput: async ctx => ({ output: await exchange(ctx.input) }),
    handleTokenRefresh: async (ctx: {
      input: z.infer<typeof inputSchema>;
      output: z.infer<typeof outputSchema>;
    }) => {
      if (
        !ctx.output.credentialFingerprint ||
        !ctx.output.clientId ||
        !ctx.output.organizationId ||
        !ctx.output.identityUrl
      )
        fail(
          'This legacy connection lacks original organization binding. Reconnect once before automatic token renewal.'
        );
      if (
        ctx.output.credentialFingerprint !==
        createHash('sha256')
          .update(
            JSON.stringify([ctx.input.clientId, ctx.input.clientSecret, ctx.input.identityUrl])
          )
          .digest('hex')
      )
        fail(
          'Original organization credentials or region changed; reconnect instead of renewing under another binding.'
        );
      const organizationId = uuid(ctx.input.clientId.slice('organization.'.length));
      const expectedServer =
        ctx.input.identityUrl === identityHosts[1]
          ? 'https://api.bitwarden.eu'
          : 'https://api.bitwarden.com';
      if (
        ctx.output.serverUrl !== expectedServer ||
        (ctx.output.identityUrl && ctx.output.identityUrl !== ctx.input.identityUrl) ||
        (ctx.output.clientId && ctx.output.clientId !== ctx.input.clientId) ||
        (ctx.output.organizationId && uuid(ctx.output.organizationId) !== organizationId)
      )
        fail(
          'Original organization or region binding changed. Reconnect rather than renewing under another organization.'
        );
      return { output: await exchange(ctx.input) };
    }
  });
