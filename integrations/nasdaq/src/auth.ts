import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { validateHttpsUrl } from './lib/http';
import { requestAccessToken } from './lib/token';

let authOutputSchema = z.object({
  token: z.string(),
  authMethod: z.enum(['api_key', 'oauth']),
  baseUrl: z.string().optional(),
  tokenEndpoint: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  oauthToken: z.string().optional(),
  oauthTokenExpiresAt: z.string().optional(),
  expiresAt: z.string().optional()
});

export let auth = SlateAuth.create()
  .output(authOutputSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your Nasdaq Data Link API key from your account settings at data.nasdaq.com.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError('A Nasdaq Data Link API key is required.');
      return { output: { token: ctx.input.apiKey, authMethod: 'api_key' as const } };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth2 Client Credentials',
    key: 'oauth_client_credentials',
    inputSchema: z.object({
      clientId: z.string().describe('Client ID provided by Nasdaq.'),
      clientSecret: z.string().describe('Client secret provided by Nasdaq.'),
      tokenEndpoint: z
        .string()
        .describe(
          'Nasdaq Cloud REST authentication URL, normally https://YOUR_HOST/v1/auth/token.'
        ),
      baseUrl: z
        .string()
        .describe(
          'Nasdaq Cloud REST API base URL provided by Nasdaq, without a version suffix.'
        )
    }),
    getOutput: async ctx => {
      let baseUrl = validateHttpsUrl(ctx.input.baseUrl, 'API base URL');
      let tokenEndpoint = validateHttpsUrl(ctx.input.tokenEndpoint, 'Token endpoint');
      let result = await requestAccessToken({ ...ctx.input, tokenEndpoint });
      return {
        output: {
          token: result.token,
          authMethod: 'oauth' as const,
          baseUrl,
          tokenEndpoint,
          clientId: ctx.input.clientId,
          clientSecret: ctx.input.clientSecret,
          oauthToken: result.token,
          oauthTokenExpiresAt: result.expiresAt,
          expiresAt: result.expiresAt
        }
      };
    },
    handleTokenRefresh: async (ctx: { output: z.infer<typeof authOutputSchema> }) => {
      let { clientId, clientSecret, tokenEndpoint, baseUrl } = ctx.output;
      if (!clientId || !clientSecret || !tokenEndpoint || !baseUrl) {
        throw createApiServiceError(
          'Nasdaq client credentials or API URLs are missing. Reconnect with OAuth2 Client Credentials.'
        );
      }
      let result = await requestAccessToken({ clientId, clientSecret, tokenEndpoint });
      return {
        output: {
          ...ctx.output,
          token: result.token,
          oauthToken: result.token,
          oauthTokenExpiresAt: result.expiresAt,
          expiresAt: result.expiresAt
        }
      };
    }
  });
