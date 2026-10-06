import {
  createApiServiceError,
  createAxios,
  getOAuthExpiresAtFromExpiresIn,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import {
  apiFailure,
  bases,
  type Environment,
  environment,
  environments,
  object,
  required
} from './lib/validation';

const permissionKeys = [
  'transactions:read',
  'cards:read',
  'cards:write',
  'spend_programs:read',
  'spend_programs:write',
  'users:read',
  'users:write',
  'locations:read',
  'departments:read',
  'departments:write',
  'business:read',
  'bills:read',
  'bills:write',
  'vendors:read',
  'entities:read',
  'reimbursements:read',
  'funds:read',
  'funds:write'
] as const;
const environmentInput = z
  .enum(environments)
  .optional()
  .describe(
    'Ramp application environment. Sandbox and production require separate application credentials.'
  );
const outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  refreshTokenExpiresAt: z.string().optional(),
  environment: z.enum(environments).optional(),
  grantedScopes: z.string().optional()
});
type Output = z.infer<typeof outputSchema>;
const resolve = (input: { environment?: Environment }, config?: unknown, output?: Output) =>
  environment(
    output?.environment ??
      input.environment ??
      (config && typeof config === 'object' && 'environment' in config
        ? config.environment
        : undefined)
  );
const token = async (
  clientId: string,
  clientSecret: string,
  selected: Environment,
  parameters: Record<string, string>,
  previous?: Output
): Promise<Output> => {
  required(clientId, 'Client ID');
  required(clientSecret, 'Client secret');
  let response: { data: unknown };
  try {
    response = await createAxios({ timeout: 30000, maxRedirects: 0 }).post<unknown>(
      `${bases[selected]}/token`,
      new URLSearchParams(parameters).toString(),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        }
      }
    );
  } catch (error) {
    apiFailure(error, 'authorization');
  }
  let data = object(response.data, 'token response');
  if (
    typeof data.expires_in !== 'number' ||
    !Number.isFinite(data.expires_in) ||
    data.expires_in <= 0 ||
    !Number.isFinite(Date.now() + data.expires_in * 1000) ||
    Date.now() + data.expires_in * 1000 > 8640000000000000
  )
    throw createApiServiceError('Ramp returned an invalid access-token lifetime.', {
      reason: 'oauth_token_response'
    });
  if (
    data.refresh_token !== undefined &&
    data.refresh_token !== null &&
    (typeof data.refresh_token !== 'string' || !data.refresh_token)
  )
    throw createApiServiceError('Ramp returned an invalid refresh token.', {
      reason: 'oauth_token_response'
    });
  if (data.scope !== undefined && typeof data.scope !== 'string')
    throw createApiServiceError('Ramp returned invalid granted scopes.', {
      reason: 'oauth_token_response'
    });
  let normalized = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Ramp',
    required: true,
    expiresInType: 'number',
    previousRefreshToken: previous?.refreshToken
  });
  let refreshTokenExpiresAt =
    typeof data.refresh_token === 'string' ? undefined : previous?.refreshTokenExpiresAt;
  if (
    typeof data.refresh_token === 'string' &&
    data.refresh_token &&
    data.refresh_token_expires_in !== undefined &&
    data.refresh_token_expires_in !== null
  ) {
    if (
      typeof data.refresh_token_expires_in !== 'number' ||
      !Number.isFinite(data.refresh_token_expires_in) ||
      data.refresh_token_expires_in <= 0 ||
      Date.now() + data.refresh_token_expires_in * 1000 > 8640000000000000
    )
      throw createApiServiceError('Ramp returned an invalid refresh-token lifetime.', {
        reason: 'oauth_token_response'
      });
    refreshTokenExpiresAt = getOAuthExpiresAtFromExpiresIn(data.refresh_token_expires_in, {
      required: true,
      expiresInType: 'number',
      providerLabel: 'Ramp'
    });
  }
  return {
    ...normalized,
    environment: selected,
    refreshTokenExpiresAt,
    grantedScopes: typeof data.scope === 'string' ? data.scope : previous?.grantedScopes
  };
};
const profile = async (output: Output, selected: Environment, scopes?: readonly string[]) => {
  let permissions = scopes ?? output.grantedScopes?.split(' ');
  if (permissions && !permissions.includes('business:read')) return { profile: {} };
  let business = await new Client({
    token: output.token,
    environment: selected
  }).getBusiness();
  if (typeof business.id !== 'string' || !business.id) return { profile: {} };
  let name =
    typeof business.business_name_legal === 'string' && business.business_name_legal
      ? business.business_name_legal
      : typeof business.business_name_on_card === 'string' && business.business_name_on_card
        ? business.business_name_on_card
        : business.id;
  return { profile: { id: business.id, name } };
};
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth({
    type: 'auth.oauth',
    key: 'oauth',
    name: 'OAuth',
    inputSchema: z.object({ environment: environmentInput }),
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Ramp authorization',
        url: 'https://docs.ramp.com/developer-api/v1/authorization'
      }
    ],
    scopes: permissionKeys.map(scope => ({
      scope,
      title: scope,
      description: `Access the ${scope.split(':')[0]} API with ${scope.endsWith(':write') ? 'write' : 'read'} permission.`
    })),
    getAuthorizationUrl: async ctx => ({
      url: `https://${resolve(ctx.input, ctx.config) === 'sandbox' ? 'demo' : 'app'}.ramp.com/v1/authorize?${new URLSearchParams({ response_type: 'code', client_id: ctx.clientId, redirect_uri: ctx.redirectUri, scope: ctx.scopes.join(' '), state: ctx.state })}`
    }),
    handleCallback: async ctx => ({
      output: await token(ctx.clientId, ctx.clientSecret, resolve(ctx.input, ctx.config), {
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      })
    }),
    handleTokenRefresh: async (ctx: {
      output: Output;
      input: { environment?: Environment };
      config?: unknown;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError(
          'This Ramp connection has no refresh token. Reconnect with the authorization-code grant enabled.',
          { reason: 'oauth_refresh' }
        );
      if (
        ctx.output.refreshTokenExpiresAt &&
        Date.parse(ctx.output.refreshTokenExpiresAt) <= Date.now()
      )
        throw createApiServiceError(
          'The Ramp refresh token has expired. Reconnect the account.',
          { reason: 'oauth_refresh' }
        );
      return {
        output: await token(
          ctx.clientId,
          ctx.clientSecret,
          resolve(ctx.input, ctx.config, ctx.output),
          { grant_type: 'refresh_token', refresh_token: ctx.output.refreshToken },
          ctx.output
        )
      };
    },
    getProfile: async (ctx: {
      output: Output;
      input: { environment?: Environment };
      config?: unknown;
    }) => profile(ctx.output, resolve(ctx.input, ctx.config, ctx.output))
  })
  .addCustomAuth({
    type: 'auth.custom',
    key: 'client_credentials',
    name: 'Client Credentials',
    docs: [
      {
        type: 'docs.auth.custom',
        name: 'Internal application authorization',
        url: 'https://docs.ramp.com/developer-api/v1/authorization'
      }
    ],
    inputSchema: z.object({
      clientId: z
        .string()
        .min(1)
        .describe(
          'Client ID of an internal Ramp application with the client-credentials grant enabled.'
        ),
      clientSecret: z.string().min(1).describe('Secret for that Ramp application.'),
      environment: environmentInput,
      scopes: z
        .array(z.enum(permissionKeys))
        .min(1)
        .describe(
          'Choose only permissions needed for the application. The resulting token has business/application permissions and does not identify a signed-in person.'
        )
    }),
    getOutput: async ctx => ({
      output: await token(
        ctx.input.clientId,
        ctx.input.clientSecret,
        resolve(ctx.input, ctx.config),
        { grant_type: 'client_credentials', scope: ctx.input.scopes.join(' ') }
      )
    }),
    handleTokenRefresh: async (ctx: {
      output: Output;
      input: {
        clientId: string;
        clientSecret: string;
        environment?: Environment;
        scopes: readonly string[];
      };
      config?: unknown;
    }) => ({
      output: await token(
        ctx.input.clientId,
        ctx.input.clientSecret,
        resolve(ctx.input, ctx.config, ctx.output),
        { grant_type: 'client_credentials', scope: ctx.input.scopes.join(' ') }
      )
    }),
    getProfile: async (ctx: {
      output: Output;
      input: { environment?: Environment; scopes: readonly string[] };
      config?: unknown;
    }) => profile(ctx.output, resolve(ctx.input, ctx.config, ctx.output), ctx.input.scopes)
  });
