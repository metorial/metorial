import { createAuthenticatedAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { apiError, Client, malformed } from './lib/client';
import {
  type AuthOutput,
  baseUrl,
  connection,
  invalid,
  origins,
  record,
  secretFree,
  token,
  version
} from './lib/connection';

const instanceFields = {
  baseUrl: z
    .string()
    .optional()
    .describe(
      'Exact HTTPS Strapi instance URL, including any deployment path prefix. Legacy connections may use their saved configuration. HTTP is accepted only for localhost development.'
    ),
  apiVersion: z
    .enum(['4', '5'])
    .optional()
    .describe(
      'Strapi major API version. Default 5; use 4 for native numeric entry IDs and attributes envelopes.'
    ),
  mediaOrigins: z
    .array(z.string())
    .optional()
    .describe(
      'Trusted HTTPS media storage origins, such as your S3 bucket or CDN. Only these origins and the connected instance can deliver existing files.'
    )
};
const outputSchema = z.object({
  token: z.string(),
  baseUrl: z.string().optional(),
  apiVersion: z.enum(['4', '5']).optional(),
  authMode: z.enum(['api_token', 'jwt_login']).optional(),
  mediaOrigins: z.array(z.string()).optional(),
  jwtManagement: z.enum(['legacy-support', 'refresh']).optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.number().optional(),
  userId: z.number().optional()
});
function expiry(jwt: string): number | undefined {
  try {
    const payload: unknown = JSON.parse(
      Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString()
    );
    if (record(payload) && Number.isSafeInteger(payload.exp) && Number(payload.exp) > 0)
      return Number(payload.exp) * 1000;
  } catch {
    /* JWT claims are used only for scheduling, never to establish identity. */
  }
  return undefined;
}
async function exchange(url: string, path: string, body: Record<string, string>) {
  const axios = createAuthenticatedAxios({
    baseURL: url,
    timeout: 30000,
    maxRedirects: 0,
    maxContentLength: 1024 * 1024,
    errorAdapter: error => apiError(error, 'authentication')
  });
  let response: { status: number; data: unknown };
  try {
    response = await axios.post(path, body);
  } catch (error) {
    throw apiError(error, 'authentication');
  }
  if (response.status !== 200 || !record(response.data)) throw malformed();
  return response.data;
}
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Raw Strapi Content API token from Settings → API Tokens. This is not an admin token or an end-user identity.'
        ),
      ...instanceFields
    }),
    getOutput: async ctx => ({
      output: connection(
        {
          token: token(ctx.input.token),
          baseUrl:
            ctx.input.baseUrl ??
            (typeof ctx.config?.baseUrl === 'string' ? ctx.config.baseUrl : undefined),
          apiVersion: ctx.input.apiVersion,
          mediaOrigins: ctx.input.mediaOrigins,
          authMode: 'api_token'
        },
        ctx.config
      )
    }),
    getProfile: async (ctx: { output: AuthOutput; config?: Record<string, unknown> }) => {
      const saved = connection(ctx.output, ctx.config);
      return {
        profile: {
          baseUrl: saved.baseUrl,
          apiVersion: saved.apiVersion,
          authentication: 'API token; end-user identity is unavailable'
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'JWT Login',
    key: 'jwt_login',
    inputSchema: z.object({
      ...instanceFields,
      baseUrl: z.string().describe('Exact Strapi instance URL used for this login.'),
      identifier: z.string().describe('Existing end-user email or username'),
      password: z.string().describe('Existing end-user password'),
      jwtManagement: z
        .enum(['legacy-support', 'refresh'])
        .optional()
        .describe(
          'Match the instance Users & Permissions JWT mode. Default legacy-support. Refresh mode requires JSON-body refresh tokens; cookie-only sessions require reconnecting.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.identifier.trim() || !ctx.input.password)
        throw invalid('Provide the existing end-user identifier and password.');
      const url = baseUrl(ctx.input.baseUrl),
        mode = ctx.input.jwtManagement ?? 'legacy-support';
      const body = await exchange(url, '/api/auth/local', {
        identifier: ctx.input.identifier,
        password: ctx.input.password
      });
      if (
        !record(body.user) ||
        !Number.isSafeInteger(body.user.id) ||
        Number(body.user.id) < 1 ||
        !secretFree(body.user, [ctx.input.password])
      )
        throw malformed();
      const jwt = token(body.jwt);
      if (mode === 'refresh' && !body.refreshToken)
        throw invalid(
          'Refresh-mode login did not return a JSON refresh token. Cookie-only sessions are not supported; configure JSON-body refresh tokens or reconnect with a supported instance mode.'
        );
      const refreshToken = mode === 'refresh' ? token(body.refreshToken) : undefined;
      const output: AuthOutput = {
        token: jwt,
        baseUrl: url,
        apiVersion: version(ctx.input.apiVersion),
        mediaOrigins: origins(ctx.input.mediaOrigins),
        authMode: 'jwt_login',
        jwtManagement: mode,
        userId: Number(body.user.id),
        ...(refreshToken ? { refreshToken } : {}),
        ...(expiry(jwt) ? { expiresAt: expiry(jwt) } : {})
      };
      return { output };
    },
    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      input: { baseUrl: string };
      config?: Record<string, unknown>;
    }) => {
      const saved = connection(ctx.output, ctx.config);
      if (baseUrl(ctx.input.baseUrl) !== saved.baseUrl) throw apiError({}, 'authentication');
      if (saved.jwtManagement !== 'refresh' || !saved.refreshToken)
        throw apiError(
          {},
          'JWT refresh; reconnect because this connection has no supported native refresh token'
        );
      const body = await exchange(saved.baseUrl, '/api/auth/refresh', {
        refreshToken: token(saved.refreshToken)
      });
      if (!body.refreshToken)
        throw invalid(
          'The refresh response omitted its rotated refresh token. Reconnect; the old token may already be invalidated and cannot safely be reused.'
        );
      const jwt = token(body.jwt),
        refreshed = token(body.refreshToken);
      const next: AuthOutput = {
        ...saved,
        token: jwt,
        refreshToken: refreshed,
        expiresAt: expiry(jwt)
      };
      await new Client(connection(next)).getMe();
      return { output: next };
    },
    getProfile: async (ctx: { output: AuthOutput; config?: Record<string, unknown> }) => {
      const saved = connection(ctx.output, ctx.config);
      const user = await new Client(saved).getMe();
      return {
        profile: {
          id: user.id,
          ...(typeof user.documentId === 'string' ? { documentId: user.documentId } : {}),
          ...(typeof user.username === 'string' ? { username: user.username } : {}),
          ...(typeof user.email === 'string' ? { email: user.email } : {}),
          baseUrl: saved.baseUrl,
          apiVersion: saved.apiVersion
        }
      };
    }
  });
