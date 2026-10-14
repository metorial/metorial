import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let api = createAxios({ baseURL: 'https://api.agencyzoom.com/v1/api' });

let tokenOutput = (data: unknown, previousRefreshToken?: string) => {
  let parsed = z
    .object({
      jwt: z.string().min(1),
      refreshToken: z.string().min(1).optional(),
      expiresIn: z.number().positive(),
      tokenType: z.string().optional()
    })
    .safeParse(data);
  if (!parsed.success) {
    throw createApiServiceError(
      'AgencyZoom did not return a valid JWT and token lifetime. Reconnect with your account email and password.'
    );
  }
  let normalized = normalizeOAuthTokenResponse(
    {
      access_token: parsed.data.jwt,
      refresh_token: parsed.data.refreshToken,
      expires_in: parsed.data.expiresIn
    },
    { providerLabel: 'AgencyZoom', previousRefreshToken }
  );
  if (!normalized.refreshToken) {
    throw createApiServiceError(
      'AgencyZoom did not return a refresh token. Reconnect with your account email and password.'
    );
  }
  return { ...normalized, tokenType: parsed.data.tokenType };
};

let apiToken = z
  .string()
  .optional()
  .describe('Additional X-Api-Token credential required by AgencyZoom for policy creation.');

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiKey: z.string().optional(),
      apiSecret: z.string().optional(),
      apiToken,
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      tokenType: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password',
    key: 'username_password',
    inputSchema: z.object({
      username: z.string().describe('AgencyZoom account email address'),
      password: z.string().describe('AgencyZoom account password'),
      apiToken
    }),
    getOutput: async ctx => {
      let response = await api.post('/auth/login', {
        username: ctx.input.username,
        password: ctx.input.password,
        version: 2
      });
      return { output: { ...tokenOutput(response.data), apiToken: ctx.input.apiToken } };
    },
    handleTokenRefresh: async (ctx: {
      input: { username: string; password: string; apiToken?: string };
      output: {
        token: string;
        apiKey?: string;
        apiSecret?: string;
        apiToken?: string;
        refreshToken?: string;
        expiresAt?: string;
        tokenType?: string;
      };
    }) => {
      let response = ctx.output.refreshToken
        ? await api.post('/auth/refresh', { refreshToken: ctx.output.refreshToken })
        : await api.post('/auth/login', {
            username: ctx.input.username,
            password: ctx.input.password,
            version: 2
          });
      return {
        output: { ...ctx.output, ...tokenOutput(response.data, ctx.output.refreshToken) }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key & Secret',
    key: 'api_key_secret',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('API Key from AgencyZoom integrations page (Zapier section)'),
      apiSecret: z
        .string()
        .describe('API Secret from AgencyZoom integrations page (Zapier section)'),
      apiToken
    }),
    getOutput: async ctx => ({
      output: {
        token: '',
        apiKey: ctx.input.apiKey,
        apiSecret: ctx.input.apiSecret,
        apiToken: ctx.input.apiToken
      }
    })
  });
