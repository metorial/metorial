import {
  createAxios,
  getOAuthExpiresAtFromExpiresIn,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client, domain, type Environment } from './lib/client';
import { apiFailure, invalid, required, responseError } from './lib/validation';

const outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  authMethod: z.enum(['oauth', 'api_key']).optional(),
  environment: z.enum(['production', 'sandbox']).optional(),
  accountName: z.string().optional()
});
type Output = z.infer<typeof outputSchema>;
async function exchange(
  environment: Environment,
  clientId: string,
  clientSecret: string,
  parameters: Record<string, string>,
  previous?: Output
): Promise<Output> {
  let response: { data: unknown };
  try {
    response = await createAxios({ timeout: 30000, maxRedirects: 0 }).post<unknown>(
      `https://${domain(environment)}/oauth/token`,
      new URLSearchParams(parameters).toString(),
      {
        auth: {
          username: required(clientId, 'Client ID'),
          password: required(clientSecret, 'Client secret')
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        }
      }
    );
  } catch (error) {
    apiFailure(error);
  }
  const parsed = z
    .object({
      access_token: z.string().min(1),
      refresh_token: z.string().min(1).optional(),
      token_type: z.string().optional(),
      expires_in: z.number().int().positive().max(86400000).optional()
    })
    .safeParse(response.data);
  if (
    !parsed.success ||
    (parsed.data.token_type && parsed.data.token_type.toLowerCase() !== 'bearer')
  )
    throw responseError();
  const normalized = normalizeOAuthTokenResponse(parsed.data, {
    providerLabel: 'Quaderno',
    previousRefreshToken: previous?.refreshToken,
    expiresInType: 'number'
  });
  // Quaderno Connect documents a 25-day access-token lifetime when no expires_in is returned.
  const identity = await new Client({
    token: normalized.token,
    authMethod: 'oauth',
    environment,
    accountName: previous?.accountName
  }).authorization();
  return {
    ...normalized,
    accountName: identity.accountName,
    expiresAt: getOAuthExpiresAtFromExpiresIn(parsed.data.expires_in ?? 25 * 86400, {
      providerLabel: 'Quaderno'
    }),
    authMethod: 'oauth',
    environment
  };
}
const getProfile = async (ctx: { output: Output }) => {
  const identity = await new Client({
    token: ctx.output.token,
    authMethod: ctx.output.authMethod,
    environment: ctx.output.environment,
    accountName: ctx.output.accountName
  }).authorization();
  return { profile: { id: identity.identityId, name: identity.name, email: identity.email } };
};
function oauth(key: 'oauth' | 'oauth_sandbox', environment: Environment) {
  return {
    type: 'auth.oauth' as const,
    key,
    name: environment === 'sandbox' ? 'OAuth 2.0 (Sandbox)' : 'OAuth 2.0 (Quaderno Connect)',
    scopes: [
      {
        title: 'Read & Write',
        description: 'Read and change account data.',
        scope: 'read_write'
      }
    ],
    getAuthorizationUrl: async (ctx: {
      clientId: string;
      redirectUri: string;
      state: string;
      scopes: string[];
    }) => {
      const unique = [...new Set(ctx.scopes)];
      if (unique.some(scope => !['read_only', 'read_write'].includes(scope)))
        throw responseError();
      const params = new URLSearchParams({
        client_id: required(ctx.clientId, 'Client ID'),
        redirect_uri: required(ctx.redirectUri, 'Redirect URI'),
        response_type: 'code',
        state: required(ctx.state, 'State'),
        scope: unique.includes('read_write') ? 'read_write' : 'read_only'
      });
      return { url: `https://${domain(environment)}/oauth/authorize?${params}` };
    },
    handleCallback: async (ctx: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      code: string;
    }) => ({
      output: await exchange(environment, ctx.clientId, ctx.clientSecret, {
        grant_type: 'authorization_code',
        code: required(ctx.code, 'Authorization code'),
        redirect_uri: required(ctx.redirectUri, 'Redirect URI')
      })
    }),
    handleTokenRefresh: async (ctx: {
      clientId: string;
      clientSecret: string;
      output: Output;
    }) => {
      if (ctx.output.environment && ctx.output.environment !== environment)
        throw invalid('Reconnect using the OAuth method for this connection environment.');
      return {
        output: await exchange(
          environment,
          ctx.clientId,
          ctx.clientSecret,
          {
            grant_type: 'refresh_token',
            refresh_token: required(ctx.output.refreshToken, 'Refresh token')
          },
          ctx.output
        )
      };
    },
    getProfile
  };
}
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth(oauth('oauth', 'production'))
  .addOauth(oauth('oauth_sandbox', 'sandbox'))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .trim()
        .min(1)
        .describe('Secret API key from Quaderno account settings.'),
      environment: z
        .enum(['production', 'sandbox'])
        .default('production')
        .describe('Environment of this key.')
    }),
    getOutput: async ctx => {
      const token = required(ctx.input.apiKey, 'API key');
      const identity = await new Client({
        token,
        authMethod: 'api_key',
        environment: ctx.input.environment
      }).authorization();
      return {
        output: {
          token,
          authMethod: 'api_key' as const,
          environment: ctx.input.environment,
          accountName: identity.accountName
        }
      };
    },
    getProfile
  });
