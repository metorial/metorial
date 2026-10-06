import {
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  requestAxios,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { safeWaveError, WaveClient } from './lib/client';
import { invalid, text } from './lib/validation';

const scopes = [
  'account:read',
  'account:write',
  'business:read',
  'customer:read',
  'customer:write',
  'invoice:read',
  'invoice:write',
  'invoice:send',
  'product:read',
  'product:write',
  'sales_tax:read',
  'sales_tax:write',
  'transaction:write',
  'vendor:read',
  'user:read'
];
const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().int().positive().max(31_536_000),
  token_type: z.enum(['Bearer', 'bearer'])
});
async function tokenRequest(input: Record<string, string>, previousRefreshToken?: string) {
  const secrets = [input.client_secret, input.code, input.refresh_token].filter(
    (value): value is string => typeof value === 'string'
  );
  const http = createAuthenticatedAxios({
    baseURL: 'https://api.waveapps.com/oauth2',
    timeout: 60_000,
    maxRedirects: 0,
    errorAdapter: error => safeWaveError(error, 'OAuth token request', secrets)
  });
  const response = await requestAxios(
    'Wave OAuth token request',
    () =>
      http.post<unknown>('/token/', new URLSearchParams(input).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }),
    error => safeWaveError(error, 'OAuth token request', secrets)
  );
  if (response.status !== 200)
    throw safeWaveError({ response }, 'OAuth token request', secrets);
  const parsed = tokenSchema.safeParse(response.data);
  if (!parsed.success)
    invalid('Wave returned an invalid OAuth token response. Reconnect before continuing.');
  return normalizeOAuthTokenResponse(parsed.data, {
    providerLabel: 'Wave',
    previousRefreshToken,
    required: true,
    expiresInType: 'number'
  });
}
async function profile(token: string) {
  const user = await new WaveClient(token).getUser();
  return {
    profile: {
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Wave account',
      email: user.defaultEmail
    }
  };
}
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().min(1),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      redirectUri: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Wave OAuth',
        url: 'https://developer.waveapps.com/hc/en-us/articles/360019493652-OAuth-Guide'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'Wave scopes',
        url: 'https://developer.waveapps.com/hc/en-us/articles/360032818132-OAuth-Scopes'
      }
    ],
    scopes: scopes.map(scope => ({
      title: scope.replace(':', ' '),
      description: `Permission for ${scope}. Write access does not imply read access; sending invoices requires invoice:send.`,
      scope
    })),
    getAuthorizationUrl: async ctx => ({
      url: `https://api.waveapps.com/oauth2/authorize/?${new URLSearchParams({ client_id: ctx.clientId, response_type: 'code', redirect_uri: ctx.redirectUri, state: ctx.state, scope: ctx.scopes.join(' ') })}`
    }),
    handleCallback: async ctx => ({
      output: {
        ...(await tokenRequest({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        })),
        redirectUri: ctx.redirectUri
      }
    }),
    handleTokenRefresh: async (ctx: {
      output: { refreshToken?: string; redirectUri?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      const refreshToken = text(
        ctx.output.refreshToken,
        'refresh token; reconnect if unavailable'
      );
      const redirectUri = text(
        ctx.output.redirectUri,
        'original OAuth redirect URI; reconnect older credentials before refresh'
      );
      return {
        output: {
          ...(await tokenRequest(
            {
              client_id: ctx.clientId,
              client_secret: ctx.clientSecret,
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
              redirect_uri: redirectUri
            },
            refreshToken
          )),
          redirectUri
        }
      };
    },
    getProfile: async (ctx: { output: { token: string } }) => profile(ctx.output.token)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Own-business Access Token',
    key: 'access_token',
    docs: [
      {
        type: 'docs.auth.token',
        name: 'Wave business-owner access tokens',
        url: 'https://developer.waveapps.com/hc/en-us/articles/360020596571-Permitted-Use-Wave-Business-Owners'
      }
    ],
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe(
          'Full-access token created in your Wave developer application for your own businesses. Replace it when expired or revoked; it is not refreshed automatically.'
        )
    }),
    getOutput: async ctx => ({
      output: { token: text(ctx.input.token, 'access token') },
      scopes
    }),
    getProfile: async (ctx: { output: { token: string } }) => profile(ctx.output.token)
  });
