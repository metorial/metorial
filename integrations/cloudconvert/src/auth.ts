import { createAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { invalidInput, invalidResponse, upstreamError } from './lib/errors';
import { environmentInput, environmentSchema } from './lib/schemas';

const scopes = [
  {
    title: 'Read account',
    scope: 'user.read',
    description: 'Read the connected account and remaining credits.'
  },
  {
    title: 'Read jobs and tasks',
    scope: 'task.read',
    description: 'Read job status, task status, and results.'
  },
  {
    title: 'Process files and manage jobs',
    scope: 'task.write',
    description: 'Create file-processing jobs and manage their task lifecycle.'
  }
];
const authOutput = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  environment: environmentSchema.optional()
});
type AuthOutput = z.infer<typeof authOutput>;
const secret = (value: unknown, name: string): string => {
  if (
    typeof value !== 'string' ||
    !value ||
    value !== value.trim() ||
    [...value].some(char => char.charCodeAt(0) < 33 || char.charCodeAt(0) === 127)
  )
    throw invalidInput(
      `${name} is required. Reconnect CloudConvert if a stored credential is missing.`
    );
  return value;
};
const environment = (value: unknown) => {
  const result = environmentSchema.safeParse(value ?? 'production');
  if (!result.success) throw invalidInput('Choose the production or sandbox API environment.');
  return result.data;
};
async function exchange(
  body: Record<string, string>,
  env: 'production' | 'sandbox',
  previous?: AuthOutput
) {
  let data: unknown;
  try {
    data = (
      await createAxios({ timeout: 30000, maxRedirects: 0 }).post<unknown>(
        'https://cloudconvert.com/oauth/token',
        new URLSearchParams(body).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
    ).data;
  } catch (error) {
    throw upstreamError(
      error,
      'OAuth token exchange',
      'Reconnect CloudConvert if refreshing the connection failed.'
    );
  }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw invalidResponse(
      'CloudConvert did not return a valid OAuth token response. Reconnect the account.'
    );
  const tokenData = data as Record<string, unknown>;
  secret(tokenData.access_token, 'OAuth access token');
  if (tokenData.refresh_token !== undefined && tokenData.refresh_token !== null)
    secret(tokenData.refresh_token, 'OAuth refresh token');
  if (
    typeof tokenData.expires_in !== 'number' ||
    !Number.isSafeInteger(tokenData.expires_in) ||
    tokenData.expires_in <= 0 ||
    tokenData.expires_in > Math.floor((8640000000000000 - Date.now()) / 1000)
  )
    throw invalidResponse(
      'CloudConvert did not return a valid OAuth token lifetime. Reconnect the account.'
    );
  const tokens = normalizeOAuthTokenResponse(data, {
    providerLabel: 'CloudConvert',
    required: true,
    expiresInType: 'number',
    previousRefreshToken: previous?.refreshToken
  });
  if (!tokens.refreshToken)
    throw invalidResponse(
      'CloudConvert did not return a refresh token. Reconnect the account.'
    );
  return { ...tokens, environment: env };
}
async function profile(ctx: {
  output: AuthOutput;
  input: { environment?: string };
  config?: Record<string, unknown>;
}) {
  const client = new Client({
    token: ctx.output.token,
    refreshToken: ctx.output.refreshToken,
    environment: ctx.output.environment ?? ctx.config?.environment ?? ctx.input.environment
  });
  const user = await client.getUser();
  return {
    profile: {
      id: user.id,
      name: user.username,
      email: user.email,
      environment: client.environment
    }
  };
}
export const auth = SlateAuth.create()
  .output(authOutput)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes,
    inputSchema: z.object({ environment: environmentInput }),
    async getAuthorizationUrl(ctx) {
      const requested = ctx.scopes.length
        ? ctx.scopes.filter(scope => scopes.some(item => item.scope === scope))
        : scopes.map(item => item.scope);
      const params = new URLSearchParams({
        client_id: secret(ctx.clientId, 'OAuth client ID'),
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: requested.join(' ')
      });
      return { url: `https://cloudconvert.com/oauth/authorize?${params}` };
    },
    async handleCallback(ctx) {
      return {
        output: await exchange(
          {
            grant_type: 'authorization_code',
            client_id: secret(ctx.clientId, 'OAuth client ID'),
            client_secret: secret(ctx.clientSecret, 'OAuth client secret'),
            redirect_uri: ctx.redirectUri,
            code: secret(ctx.code, 'OAuth authorization code')
          },
          environment(ctx.input.environment)
        )
      };
    },
    async handleTokenRefresh(ctx: {
      output: AuthOutput;
      input: { environment?: string };
      clientId: string;
      clientSecret: string;
      config?: Record<string, unknown>;
    }) {
      return {
        output: await exchange(
          {
            grant_type: 'refresh_token',
            client_id: secret(ctx.clientId, 'OAuth client ID'),
            client_secret: secret(ctx.clientSecret, 'OAuth client secret'),
            refresh_token: secret(ctx.output.refreshToken, 'OAuth refresh token')
          },
          environment(
            ctx.output.environment ?? ctx.config?.environment ?? ctx.input.environment
          ),
          ctx.output
        )
      };
    },
    getProfile: profile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe('CloudConvert API key with user.read, task.read, and task.write scopes.'),
      environment: environmentInput
    }),
    async getOutput(ctx) {
      return {
        output: {
          token: secret(ctx.input.token, 'API key'),
          environment: environment(ctx.input.environment)
        }
      };
    },
    getProfile: profile
  });
