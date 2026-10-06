import {
  createApiServiceError,
  createAxios,
  getOAuthExpiresAtFromExpiresIn,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { apiFailure, parseResponse, required } from './lib/validation';

const outputSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional()
});
type Output = z.infer<typeof outputSchema>;
async function exchange(
  clientId: string,
  clientSecret: string,
  parameters: Record<string, string>,
  previous?: Output
): Promise<Output> {
  let response: { data: unknown };
  try {
    response = await createAxios({ timeout: 30000, maxRedirects: 0 }).post<unknown>(
      'https://app.ynab.com/oauth/token',
      new URLSearchParams({
        client_id: required(clientId, 'Client ID'),
        client_secret: required(clientSecret, 'Client secret'),
        ...parameters
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        }
      }
    );
  } catch (error) {
    apiFailure(error);
  }
  const data = parseResponse(
    z.object({
      access_token: z.string().min(1),
      token_type: z.string().optional(),
      refresh_token: z.string().min(1).optional(),
      expires_in: z.number().int().positive().max(86400000)
    }),
    response.data
  );
  if (data.token_type && data.token_type.toLowerCase() !== 'bearer')
    throw createApiServiceError('YNAB returned an unsupported token type.', {
      reason: 'oauth_token_response'
    });
  const normalized = normalizeOAuthTokenResponse(data, {
    providerLabel: 'YNAB',
    required: true,
    expiresInType: 'number',
    previousRefreshToken: previous?.refreshToken
  });
  return {
    token: normalized.token,
    refreshToken: normalized.refreshToken,
    expiresAt: getOAuthExpiresAtFromExpiresIn(data.expires_in, { providerLabel: 'YNAB' })
  };
}
const getProfile = async (ctx: { output: Output }) => ({
  profile: { id: (await new Client({ token: ctx.output.token }).getUser()).id }
});
function oauth(key: 'oauth' | 'oauth_read_only', readOnly: boolean) {
  return {
    type: 'auth.oauth' as const,
    name: readOnly ? 'OAuth (Read Only)' : 'OAuth',
    key,
    scopes: readOnly
      ? [
          {
            title: 'Read Only',
            description: 'Read YNAB data without changing it.',
            scope: 'read-only'
          }
        ]
      : [],
    getAuthorizationUrl: async (ctx: {
      clientId: string;
      redirectUri: string;
      state: string;
    }) => {
      const params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state
      });
      if (readOnly) params.set('scope', 'read-only');
      return { url: `https://app.ynab.com/oauth/authorize?${params.toString()}` };
    },
    handleCallback: async (ctx: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      code: string;
    }) => ({
      output: await exchange(ctx.clientId, ctx.clientSecret, {
        redirect_uri: ctx.redirectUri,
        grant_type: 'authorization_code',
        code: required(ctx.code, 'Authorization code')
      })
    }),
    handleTokenRefresh: async (ctx: {
      clientId: string;
      clientSecret: string;
      output: Output;
    }) => ({
      output: await exchange(
        ctx.clientId,
        ctx.clientSecret,
        {
          grant_type: 'refresh_token',
          refresh_token: required(ctx.output.refreshToken, 'Refresh token')
        },
        ctx.output
      )
    }),
    getProfile
  };
}
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addOauth(oauth('oauth', false))
  .addOauth(oauth('oauth_read_only', true))
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .trim()
        .min(1)
        .describe('Personal access token from YNAB Account Settings > Developer Settings.')
    }),
    getOutput: async ctx => ({
      output: { token: required(ctx.input.token, 'Personal access token') }
    }),
    getProfile
  });
