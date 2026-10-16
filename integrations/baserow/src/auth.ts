import { createApiServiceError, createAuthenticatedAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import {
  apiError,
  Client,
  type ClientConfig,
  readResponse,
  resolveBaseUrl
} from './lib/client';

let userSchema = z.object({ username: z.string(), first_name: z.string() }).catchall(z.any());
type JwtContext = {
  output: ClientConfig & { expiresAt?: number; user?: z.infer<typeof userSchema> };
  input: { email: string; password: string; baseUrl?: string };
  config?: Record<string, unknown>;
};
let baseUrlInput = z
  .string()
  .optional()
  .describe('Base URL of your Baserow instance. Defaults to https://api.baserow.io.');
let jwtOutput = (data: unknown, baseUrl: string, previousRefreshToken?: string) => {
  let result = readResponse(
    z.object({
      access_token: z.string().optional(),
      token: z.string().optional(),
      refresh_token: z.string().optional(),
      user: userSchema.optional(),
      two_factor_auth: z.string().optional()
    }),
    data,
    'authentication'
  );
  if (result.two_factor_auth)
    throw createApiServiceError(
      'This Baserow account requires two-factor authentication. Use a Database Token connection for table data operations.'
    );
  let token = result.access_token ?? result.token;
  if (!token) throw createApiServiceError('Baserow did not return an access token.');
  let expiresAt: number | undefined;
  try {
    let payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')
    );
    if (typeof payload.exp === 'number' && Number.isFinite(payload.exp))
      expiresAt = payload.exp * 1000;
  } catch {
    // Older instances can issue opaque tokens; no expiry is inferred for them.
  }
  return {
    token,
    authType: 'jwt' as const,
    baseUrl,
    refreshToken: result.refresh_token ?? previousRefreshToken,
    expiresAt,
    user: result.user
  };
};
let login = async (
  input: { email: string; password: string; baseUrl?: string },
  legacyBaseUrl?: unknown
) => {
  let baseUrl = resolveBaseUrl(input.baseUrl, legacyBaseUrl);
  let http = createAuthenticatedAxios({ baseURL: baseUrl, errorAdapter: apiError });
  let response = await http.post('/api/user/token-auth/', {
    email: input.email,
    username: input.email,
    password: input.password
  });
  return jwtOutput(response.data, baseUrl);
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Authentication token (Database Token or JWT)'),
      authType: z
        .enum(['database_token', 'jwt'])
        .describe('The type of authentication being used'),
      baseUrl: z.string().optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.number().optional(),
      user: userSchema.optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Database Token',
    key: 'database_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Your Baserow Database Token. Create one in Settings > Database Tokens.'),
      baseUrl: baseUrlInput
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('Provide a Baserow Database Token.');
      return {
        output: {
          token: ctx.input.token,
          authType: 'database_token' as const,
          baseUrl: resolveBaseUrl(ctx.input.baseUrl, ctx.config?.baseUrl)
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'JWT (Email & Password)',
    key: 'jwt',
    inputSchema: z.object({
      email: z.string().describe('Your Baserow account email address'),
      password: z.string().describe('Your Baserow account password'),
      baseUrl: baseUrlInput
    }),
    getOutput: async ctx => ({ output: await login(ctx.input, ctx.config?.baseUrl) }),
    handleTokenRefresh: async (ctx: JwtContext) => {
      if (!ctx.output.refreshToken)
        return { output: await login(ctx.input, ctx.output.baseUrl ?? ctx.config?.baseUrl) };
      let baseUrl = resolveBaseUrl(ctx.output.baseUrl, ctx.input.baseUrl, ctx.config?.baseUrl);
      let http = createAuthenticatedAxios({ baseURL: baseUrl, errorAdapter: apiError });
      let response = await http.post('/api/user/token-refresh/', {
        refresh_token: ctx.output.refreshToken
      });
      return {
        output: {
          ...ctx.output,
          ...jwtOutput(response.data, baseUrl, ctx.output.refreshToken)
        }
      };
    },
    getProfile: async (ctx: JwtContext) => {
      let user =
        ctx.output.user ??
        (await new Client({
          ...ctx.output,
          baseUrl: resolveBaseUrl(ctx.output.baseUrl, ctx.input.baseUrl, ctx.config?.baseUrl)
        }).getCurrentUser());
      return { profile: { id: user.username, name: user.first_name, email: user.username } };
    }
  });
