import { createAuthenticatedAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { apiError, fail, required } from './lib/validation';

// Partner endpoint URLs are inherited; public API docs do not publish the partner OAuth contract.
const tokenUrl = 'https://app.lexoffice.de/oauth2/token';
type ProfileContext = { output: { token: string } };
type RefreshContext = ProfileContext & {
  clientId: string;
  clientSecret: string;
  output: { token: string; refreshToken?: string };
};
const normalize = (data: unknown, previousRefreshToken?: string) => {
  const parsed = z
    .object({
      access_token: z.string().min(1),
      refresh_token: z.string().min(1).nullish(),
      expires_in: z.union([z.number(), z.string()]).nullish()
    })
    .safeParse(data);
  if (!parsed.success || !parsed.data.access_token.trim())
    fail('Lexoffice returned an invalid OAuth token response.');
  const expiry = parsed.data.expires_in;
  if (
    expiry !== undefined &&
    expiry !== null &&
    (!Number.isFinite(Number(expiry)) ||
      Number(expiry) <= 0 ||
      Date.now() + Number(expiry) * 1000 > 8640000000000000)
  )
    fail('Lexoffice returned an invalid OAuth expiry.');
  return normalizeOAuthTokenResponse(parsed.data, {
    providerLabel: 'Lexoffice',
    previousRefreshToken
  });
};
const tokenClient = (clientId: string, clientSecret: string) =>
  createAuthenticatedAxios({
    authHeader: {
      value: `Basic ${Buffer.from(`${required(clientId, 'OAuth client ID')}:${required(clientSecret, 'OAuth client secret')}`).toString('base64')}`
    },
    contentType: 'application/x-www-form-urlencoded',
    headers: { Accept: 'application/json' },
    timeout: 30000,
    maxRedirects: 0,
    errorAdapter: apiError
  });
const profile = async (token: string) => {
  const value = await new Client({ token }).getProfile();
  return { profile: { id: value.organizationId, name: value.companyName } };
};
export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0 (Partner API)',
    key: 'oauth',
    scopes: [],
    getAuthorizationUrl: async ctx => {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: required(ctx.clientId, 'OAuth client ID'),
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });
      return { url: `https://app.lexoffice.de/oauth2/authorize?${params.toString()}` };
    },
    handleCallback: async ctx => {
      const response = await tokenClient(ctx.clientId, ctx.clientSecret).post<unknown>(
        tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: required(ctx.code, 'Authorization code'),
          redirect_uri: ctx.redirectUri
        }).toString()
      );
      return { output: normalize(response.data) };
    },
    handleTokenRefresh: async (ctx: RefreshContext) => {
      const previous = required(ctx.output.refreshToken, 'Refresh token');
      const response = await tokenClient(ctx.clientId, ctx.clientSecret).post<unknown>(
        tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: previous
        }).toString()
      );
      return { output: normalize(response.data, previous) };
    },
    getProfile: async (ctx: ProfileContext) => profile(ctx.output.token)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'API key generated at https://app.lexware.de/addons/public-api with permissions for the tools you use'
        )
    }),
    getOutput: async ctx => ({ output: { token: required(ctx.input.apiKey, 'API key') } }),
    getProfile: async (ctx: ProfileContext) => profile(ctx.output.token)
  });
