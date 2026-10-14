import {
  buildApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from './lib/client';

let baseUrlSchema = z
  .enum(['https://api.connecteam.com', 'https://api-au.connecteam.com'])
  .optional()
  .describe('API host. Use the Australia host if you sign in at app-au.connecteam.com.');

let credentialsSchema = z.object({
  clientId: z.string().describe('OAuth 2.0 Client ID'),
  clientSecret: z.string().describe('OAuth 2.0 Client Secret'),
  scopes: z
    .string()
    .optional()
    .describe('Space-separated scopes, such as users.read or time_clock.read'),
  baseUrl: baseUrlSchema
});

let issueAccessToken = async (
  input: z.infer<typeof credentialsSchema>,
  previousBaseUrl?: z.infer<typeof baseUrlSchema>
) => {
  let baseUrl = input.baseUrl ?? previousBaseUrl ?? 'https://api.connecteam.com';
  let credentials = Buffer.from(`${input.clientId}:${input.clientSecret}`).toString('base64');
  let http = createAuthenticatedAxios({
    baseURL: baseUrl,
    timeout: 30000,
    authHeader: { value: `Basic ${credentials}` },
    contentType: 'application/x-www-form-urlencoded',
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Connecteam',
        reason: 'connecteam_auth_error',
        operation: 'issue access token'
      })
  });
  let body = new URLSearchParams({ grant_type: 'client_credentials' });
  if (input.scopes) body.set('scope', input.scopes);
  let response = await http.post('/oauth/v1/token', body.toString());
  let normalized = normalizeOAuthTokenResponse(response.data, {
    providerLabel: 'Connecteam',
    required: true
  });
  return {
    token: normalized.token,
    expiresAt: normalized.expiresAt,
    authType: 'oauth' as const,
    baseUrl
  };
};

let authOutputSchema = z.object({
  token: z.string(),
  authType: z.enum(['api_key', 'oauth']).optional(),
  baseUrl: baseUrlSchema,
  expiresAt: z.string().optional()
});
type AuthOutput = z.infer<typeof authOutputSchema>;

export let auth = SlateAuth.create()
  .output(authOutputSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Connecteam API key. Found in Settings > API Keys.'),
      baseUrl: baseUrlSchema
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiKey,
        authType: 'api_key' as const,
        baseUrl: ctx.input.baseUrl ?? 'https://api.connecteam.com'
      }
    }),
    getProfile: async (ctx: { output: AuthOutput }) => {
      let data = await new ConnecteamClient(ctx.output).getAccount();
      return { profile: { id: data.companyId, name: data.companyName } };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth 2.0 Client Credentials',
    key: 'oauth_client_credentials',
    inputSchema: credentialsSchema,
    getOutput: async ctx => ({ output: await issueAccessToken(ctx.input) }),
    handleTokenRefresh: async (ctx: {
      output: AuthOutput;
      input: z.infer<typeof credentialsSchema>;
    }) => ({
      output: await issueAccessToken(ctx.input, ctx.output.baseUrl)
    }),
    getProfile: async (ctx: { output: AuthOutput }) => {
      let data = await new ConnecteamClient(ctx.output).getAccount();
      return { profile: { id: data.companyId, name: data.companyName } };
    }
  });
