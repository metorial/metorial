import { createApiServiceError, getOAuthExpiresAtFromExpiresIn, SlateAuth } from 'slates';
import { z } from 'zod';
import { EpicHttp } from './lib/http';
import { accountSchema, parse } from './lib/types';
import { identifier, protect, time } from './lib/validation';

const outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  accountId: z.string().optional(),
  clientId: z.string().optional(),
  authType: z.enum(['oauth', 'client_credentials']).optional(),
  deploymentId: z.string().optional(),
  sandboxId: z.string().optional(),
  organizationId: z.string().optional(),
  productId: z.string().optional(),
  applicationId: z.string().optional(),
  features: z.array(z.string()).optional(),
  grantedScope: z.string().optional(),
  grantObserved: z.boolean().optional(),
  deploymentObserved: z.boolean().optional()
});
export type EpicAuth = z.infer<typeof outputSchema>;
const deploymentInput = z
  .string()
  .optional()
  .describe(
    'Optional authorized EOS deployment ID from your product client setup. The token grant records its actual deployment; this is not a deployment-discovery API.'
  );
const nativeGrant = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  expires_at: z.string().optional(),
  expires_in: z.number().int().positive().optional(),
  account_id: z.string().optional(),
  client_id: z.string().optional(),
  application_id: z.string().optional(),
  deployment_id: z.string().optional(),
  sandbox_id: z.string().optional(),
  organization_id: z.string().optional(),
  product_id: z.string().optional(),
  features: z.array(z.string()).optional(),
  scope: z.string().optional(),
  token_type: z.string().optional()
});
function deployment(
  input: { deploymentId?: string },
  config?: Record<string, unknown>,
  prior?: EpicAuth
) {
  const value = prior?.deploymentId ?? input.deploymentId ?? config?.deploymentId;
  if (value !== undefined) identifier(value, 'Deployment ID');
  return value;
}
async function exchange(
  clientId: string,
  clientSecret: string,
  authType: 'oauth' | 'client_credentials',
  values: Record<string, string>,
  target?: string,
  prior?: EpicAuth
): Promise<EpicAuth> {
  identifier(clientId, 'Client ID');
  if (!clientSecret || [...clientSecret].some(c => c.charCodeAt(0) < 32))
    throw createApiServiceError('Supply the intended Epic client secret before connecting.');
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const http = new EpicHttp(
    [
      clientSecret,
      basic,
      ...Object.entries(values)
        .filter(([key]) => ['code', 'refresh_token'].includes(key))
        .map(([, value]) => value)
    ],
    `Basic ${basic}`
  );
  const response = await http.request(
    'POST',
    authType === 'oauth' ? '/epic/oauth/v2/token' : '/auth/v1/oauth/token',
    {
      data: new URLSearchParams({
        ...values,
        ...(target ? { deployment_id: target } : {})
      }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      tokenResponse: true,
      confidentialBody: true
    }
  );
  const data = parse(nativeGrant, response.data, 'token grant');
  protect([data.access_token, data.refresh_token], [clientSecret, basic]);
  if (data.token_type && data.token_type.toLowerCase() !== 'bearer')
    throw createApiServiceError(
      'Epic returned an unsupported token type. Reconnect the intended client.'
    );
  if (
    (data.client_id && data.client_id !== clientId) ||
    (target && data.deployment_id && data.deployment_id !== target) ||
    (prior?.accountId && data.account_id && prior.accountId !== data.account_id)
  )
    throw createApiServiceError(
      'Epic token renewal changed the bound account, client or deployment. Reconnect the intended context.'
    );
  for (const [native, key] of [
    ['organization_id', 'organizationId'],
    ['product_id', 'productId'],
    ['sandbox_id', 'sandboxId']
  ] as const)
    if (prior?.[key] && data[native] && prior[key] !== data[native])
      throw createApiServiceError(
        'Epic token renewal changed the bound game-service context. Reconnect the intended client.'
      );
  const expiresAt =
    data.expires_at ??
    (data.expires_in !== undefined
      ? getOAuthExpiresAtFromExpiresIn(data.expires_in)
      : undefined);
  if (expiresAt) time(expiresAt, 'Token expiry');
  return {
    grantObserved: true,
    deploymentObserved: data.deployment_id !== undefined,
    token: data.access_token,
    refreshToken: data.refresh_token ?? prior?.refreshToken,
    expiresAt,
    accountId: data.account_id ?? prior?.accountId,
    clientId,
    authType,
    deploymentId: data.deployment_id ?? target,
    sandboxId: data.sandbox_id ?? prior?.sandboxId,
    organizationId: data.organization_id ?? prior?.organizationId,
    productId: data.product_id ?? prior?.productId,
    applicationId: data.application_id ?? prior?.applicationId,
    features: data.features ?? prior?.features,
    grantedScope: data.scope ?? prior?.grantedScope
  };
}
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'Epic Account OAuth',
    key: 'epic_oauth',
    inputSchema: z.object({ deploymentId: deploymentInput }),
    scopes: [
      {
        title: 'Basic Profile',
        description: 'Read account information for users who consented to this application.',
        scope: 'basic_profile'
      },
      {
        title: 'Friends List',
        description:
          'Read the authenticated user’s application-consented friends through the legacy HTTP compatibility action.',
        scope: 'friends_list'
      }
    ],
    getAuthorizationUrl: async ctx => ({
      url: `https://www.epicgames.com/id/authorize?${new URLSearchParams({ client_id: ctx.clientId, response_type: 'code', scope: ctx.scopes.join(' '), redirect_uri: ctx.redirectUri, state: ctx.state })}`
    }),
    handleCallback: async ctx => ({
      output: await exchange(
        ctx.clientId,
        ctx.clientSecret,
        'oauth',
        {
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          scope: ctx.scopes.join(' ')
        },
        deployment(ctx.input, ctx.config)
      )
    }),
    handleTokenRefresh: async (ctx: {
      output: EpicAuth;
      input: { deploymentId?: string };
      clientId: string;
      clientSecret: string;
      scopes: string[];
      config?: Record<string, unknown>;
    }) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError(
          'This Epic client did not issue a refresh token. Reconnect the intended account when its access token expires.'
        );
      if (ctx.output.clientId && ctx.output.clientId !== ctx.clientId)
        throw createApiServiceError(
          'The original OAuth client changed. Reconnect the intended account.'
        );
      return {
        output: await exchange(
          ctx.clientId,
          ctx.clientSecret,
          'oauth',
          { grant_type: 'refresh_token', refresh_token: ctx.output.refreshToken },
          deployment(ctx.input, ctx.config, ctx.output),
          ctx.output
        )
      };
    },
    getProfile: async (ctx: { output: EpicAuth }) => {
      if (!ctx.output.accountId)
        throw createApiServiceError(
          'The Epic account grant omitted its account identifier. Reconnect using an account-authorized client.'
        );
      const response = await new EpicHttp(
        [ctx.output.token, ctx.output.refreshToken ?? ''],
        `Bearer ${ctx.output.token}`
      ).request('GET', '/epic/id/v2/accounts', {
        params: { accountId: [ctx.output.accountId] }
      });
      const rows = parse(z.array(accountSchema), response.data, 'account profile');
      const account = rows.find(row => row.accountId === ctx.output.accountId);
      if (rows.length !== 1 || !account)
        throw createApiServiceError(
          'Epic did not return the exact authenticated account profile. Verify application consent.'
        );
      return { profile: { id: account.accountId, name: account.displayName } };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'EOS Game Services Client',
    key: 'client_credentials',
    inputSchema: z.object({
      clientId: z.string().describe('EOS client ID from your authorized developer setup.'),
      clientSecret: z
        .string()
        .describe(
          'EOS client secret. This client grants game-service access, not Epic Account OAuth access.'
        ),
      deploymentId: deploymentInput
    }),
    getOutput: async ctx => ({
      output: await exchange(
        ctx.input.clientId,
        ctx.input.clientSecret,
        'client_credentials',
        { grant_type: 'client_credentials' },
        deployment(ctx.input, ctx.config)
      )
    }),
    handleTokenRefresh: async (ctx: {
      output: EpicAuth;
      input: { clientId: string; clientSecret: string; deploymentId?: string };
      config?: Record<string, unknown>;
    }) => {
      if (ctx.output.clientId && ctx.output.clientId !== ctx.input.clientId)
        throw createApiServiceError(
          'The original EOS client changed. Reconnect the intended client.'
        );
      return {
        output: await exchange(
          ctx.input.clientId,
          ctx.input.clientSecret,
          'client_credentials',
          { grant_type: 'client_credentials' },
          deployment(ctx.input, ctx.config, ctx.output),
          ctx.output
        )
      };
    },
    getProfile: async (ctx: { output: EpicAuth }) => ({
      profile: {
        id: ctx.output.clientId,
        name: 'EOS game-service client',
        ...(ctx.output.deploymentId ? { deploymentId: ctx.output.deploymentId } : {})
      }
    })
  });
