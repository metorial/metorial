import { createApiServiceError, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { createAuthenticatedAxios, getBaseUrl, validateConnectBaseUrl } from './lib/client';

let requestConnectToken = async (
  input: { clientId: string; clientSecret: string; scopes: string; baseUrl?: string },
  baseUrl: string,
  previousRefreshToken?: string
) => {
  if (!input.clientId || !input.clientSecret) {
    throw createApiServiceError('Reconnect with your Instacart Connect client ID and secret.');
  }
  let client = createAuthenticatedAxios('', 'production', baseUrl);
  // The token endpoint accepts client credentials in the body, never the query.
  let response = await client.post(
    '/v2/oauth/token',
    {
      client_id: input.clientId,
      client_secret: input.clientSecret,
      grant_type: 'client_credentials',
      scope: input.scopes
    },
    { headers: { Authorization: undefined } }
  );
  return {
    ...normalizeOAuthTokenResponse(response.data, {
      providerLabel: 'Instacart Connect',
      required: true,
      previousRefreshToken
    }),
    authMethod: 'oauth_client_credentials' as const,
    baseUrl: input.baseUrl !== undefined ? baseUrl : undefined,
    scopes: typeof response.data.scope === 'string' ? response.data.scope : input.scopes
  };
};

export let auth = SlateAuth.create()
  .output(
    z
      .object({
        token: z.string().describe('Developer Platform API key or Connect access token'),
        authMethod: z
          .enum(['api_key', 'oauth_client_credentials'])
          .describe('Credential type'),
        refreshToken: z.string().optional(),
        expiresAt: z.string().optional(),
        baseUrl: z.string().optional().describe('Assigned Connect server origin'),
        scopes: z.string().optional().describe('Granted Connect scopes')
      })
      .passthrough()
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key (Developer Platform)',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('API key from the Instacart Developer Dashboard')
    }),
    getOutput: async ctx => ({
      output: { token: ctx.input.apiKey, authMethod: 'api_key' as const }
    })
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth 2.0 Client Credentials (Connect)',
    key: 'oauth_client_credentials',
    inputSchema: z.object({
      clientId: z.string().describe('OAuth client ID provided by Instacart'),
      clientSecret: z.string().describe('OAuth client secret provided by Instacart'),
      scopes: z
        .string()
        .describe(
          'Comma-separated client-credentials scopes, such as connect:fulfillment. Post-checkout and account linking require different grant types.'
        ),
      baseUrl: z
        .string()
        .optional()
        .describe(
          'Assigned Instacart Connect HTTPS server origin. Omit for the production server.'
        )
    }),
    getOutput: async ctx => ({
      output: await requestConnectToken(
        ctx.input,
        ctx.input.baseUrl !== undefined
          ? validateConnectBaseUrl(ctx.input.baseUrl)
          : getBaseUrl('production')
      )
    }),
    handleTokenRefresh: async (ctx: {
      output: {
        token: string;
        authMethod: 'api_key' | 'oauth_client_credentials';
        refreshToken?: string;
        expiresAt?: string;
        baseUrl?: string;
        scopes?: string;
        [key: string]: unknown;
      };
      input: { clientId: string; clientSecret: string; scopes: string; baseUrl?: string };
    }) => {
      if (ctx.output.authMethod === 'api_key') {
        throw createApiServiceError(
          'Developer Platform API keys cannot be refreshed as Connect credentials.'
        );
      }
      let baseUrl = ctx.output.baseUrl ?? ctx.input.baseUrl ?? getBaseUrl('production');
      return {
        output: {
          ...ctx.output,
          ...(await requestConnectToken(
            {
              ...ctx.input,
              baseUrl: ctx.output.baseUrl ?? ctx.input.baseUrl,
              scopes: ctx.output.scopes ?? ctx.input.scopes
            },
            validateConnectBaseUrl(baseUrl),
            ctx.output.refreshToken
          ))
        }
      };
    }
  });
