import { createAuthenticatedAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { z } from 'zod';
import { OmnisendClient, safeApiError } from './lib/client';
import { invalid, type OmnisendAuth, record, text } from './lib/contracts';

let getProfile = async (ctx: { output: OmnisendAuth }) => {
  let brand = await new OmnisendClient(ctx.output, '2026-03-15').getBrand();
  return { profile: { id: brand.brandId, name: brand.name ?? brand.brandId } };
};

let exchange = async (parameters: Record<string, string>, previousRefreshToken?: string) => {
  let http = createAuthenticatedAxios({
    baseURL: 'https://app.omnisend.com',
    timeout: 30000,
    maxRedirects: 0,
    contentType: 'application/x-www-form-urlencoded'
  });
  let response: { status: number; data: unknown };
  try {
    response = await http.post<unknown>(
      '/oauth2/token',
      new URLSearchParams(parameters).toString()
    );
  } catch (error) {
    throw safeApiError(error, 'authentication');
  }
  if (response.status !== 200)
    invalid(
      'Omnisend returned an unexpected authentication status. Reconnect rather than retrying an uncertain token exchange.'
    );
  let data = record(response.data);
  text(data.access_token, 'access token');
  if (data.refresh_token !== undefined && data.refresh_token !== null)
    text(data.refresh_token, 'refresh token');
  if (
    data.token_type !== undefined &&
    (typeof data.token_type !== 'string' || data.token_type.toLowerCase() !== 'bearer')
  )
    invalid('Omnisend returned an unsupported OAuth token type.');
  if (data.expires_in !== undefined && data.expires_in !== null) {
    let seconds =
      typeof data.expires_in === 'number'
        ? data.expires_in
        : typeof data.expires_in === 'string' && /^\d+$/.test(data.expires_in)
          ? Number(data.expires_in)
          : Number.NaN;
    if (!Number.isFinite(seconds) || seconds < 0 || Date.now() + seconds * 1000 > 8.64e15)
      invalid('Omnisend returned an invalid OAuth expiry.');
  }
  let output = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Omnisend',
    previousRefreshToken
  });
  return { ...output, authType: 'oauth' as const };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authType: z.enum(['api_key', 'oauth']).optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      { title: 'Contacts Read', scope: 'contacts.read' },
      { title: 'Contacts Write', scope: 'contacts.write' },
      { title: 'Events Write', scope: 'events.write' },
      { title: 'Products Read', scope: 'products.read' },
      { title: 'Products Write', scope: 'products.write' },
      { title: 'Campaigns Read', scope: 'campaigns.read' },
      { title: 'Automations Read', scope: 'automations.read' },
      { title: 'Brands Read', scope: 'brands.read' }
    ],
    getAuthorizationUrl: async ctx => ({
      url:
        'https://app.omnisend.com/oauth2/authorize?' +
        new URLSearchParams({
          client_id: text(ctx.clientId, 'OAuth client ID'),
          redirect_uri: ctx.redirectUri,
          response_type: 'code',
          scope: ctx.scopes.join(' '),
          state: text(ctx.state, 'OAuth state')
        }).toString()
    }),
    handleCallback: async ctx => ({
      output: await exchange({
        grant_type: 'authorization_code',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        code: text(ctx.code, 'authorization code')
      })
    }),
    handleTokenRefresh: async (ctx: {
      output: OmnisendAuth;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken)
        invalid(
          'This Omnisend OAuth connection has no refresh token. Reconnect to renew authentication.'
        );
      let output = await exchange(
        {
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: text(ctx.output.refreshToken, 'refresh token')
        },
        ctx.output.refreshToken
      );
      return { output };
    },
    getProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Omnisend API key with access to the required contact, catalog, event and brand resources.'
        )
    }),
    getOutput: async ctx => ({
      output: { token: text(ctx.input.token, 'API key'), authType: 'api_key' as const }
    }),
    getProfile
  });
