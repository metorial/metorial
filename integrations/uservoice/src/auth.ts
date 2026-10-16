import { createAuthenticatedAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, rejectUserVoiceErrors, resolveSubdomain, uservoiceError } from './lib/client';

type AuthOutput = {
  token: string;
  subdomain?: string;
  refreshToken?: string;
  expiresAt?: string;
};
type Credentials = { subdomain: string; clientId: string; clientSecret: string };

let exchangeCredentials = async (
  input: Credentials,
  previousOutput?: AuthOutput,
  legacySubdomain?: unknown
): Promise<AuthOutput> => {
  let subdomain = resolveSubdomain(
    previousOutput?.subdomain ?? input.subdomain,
    legacySubdomain
  );
  let http = createAuthenticatedAxios({
    baseURL: `https://${subdomain}.uservoice.com`,
    errorAdapter: uservoiceError
  });
  http.interceptors.response.use(response => {
    rejectUserVoiceErrors(response);
    return response;
  });
  let response = await http.post('/api/v2/oauth/token', {
    grant_type: 'client_credentials',
    client_id: input.clientId,
    client_secret: input.clientSecret
  });
  return {
    ...normalizeOAuthTokenResponse(response.data, {
      providerLabel: 'UserVoice',
      previousRefreshToken: previousOutput?.refreshToken
    }),
    subdomain
  };
};

let getProfile = async (ctx: { output: AuthOutput; config?: Record<string, unknown> }) => {
  let client = new Client({
    ...ctx.output,
    legacySubdomain: ctx.config?.subdomain
  });
  let user = await client.getCurrentUser();
  return {
    profile: {
      id: user?.id !== undefined ? String(user.id) : undefined,
      name: user?.name,
      email: user?.email_address,
      imageUrl: user?.avatar_url
    }
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      subdomain: z.string().optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Credentials',
    key: 'api_credentials',
    inputSchema: z.object({
      subdomain: z
        .string()
        .describe('Your UserVoice subdomain (e.g., "mycompany" for mycompany.uservoice.com)'),
      clientId: z.string().describe('Your UserVoice API Key (Client ID)'),
      clientSecret: z.string().describe('Your UserVoice API Secret (Client Secret)')
    }),
    getOutput: async ctx => ({
      output: await exchangeCredentials(ctx.input, undefined, ctx.config?.subdomain)
    }),
    handleTokenRefresh: async (ctx: {
      input: Credentials;
      output: AuthOutput;
      config?: Record<string, unknown>;
    }) => ({
      output: await exchangeCredentials(ctx.input, ctx.output, ctx.config?.subdomain)
    }),
    getProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bearer Token',
    key: 'bearer_token',
    inputSchema: z.object({
      subdomain: z
        .string()
        .describe('Your UserVoice subdomain (e.g., "mycompany" for mycompany.uservoice.com)'),
      token: z.string().describe('Your UserVoice API bearer token')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        subdomain: resolveSubdomain(ctx.input.subdomain, ctx.config?.subdomain)
      }
    }),
    getProfile
  });
