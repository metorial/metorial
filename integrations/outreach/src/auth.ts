import {
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { API_ORIGIN, outreachError } from './lib/client';

const api = createAuthenticatedAxios({
  baseURL: API_ORIGIN,
  contentType: 'application/x-www-form-urlencoded',
  timeout: 30000,
  maxRedirects: 0,
  errorAdapter: outreachError
});
const exchange = async (params: Record<string, string>) => {
  const response = await api.post('/oauth/token', new URLSearchParams(params).toString());
  const data: unknown = response.data;
  if (
    !isApiErrorRecord(data) ||
    typeof data.refresh_token !== 'string' ||
    !data.refresh_token.trim() ||
    typeof data.expires_in !== 'number' ||
    data.expires_in <= 0 ||
    !Number.isFinite(new Date(Date.now() + data.expires_in * 1000).getTime())
  )
    throw createApiServiceError(
      'Outreach did not return a valid rotating refresh token and expiry. Reconnect; do not reuse a replaced refresh token.'
    );
  return normalizeOAuthTokenResponse(data, {
    providerLabel: 'Outreach',
    expiresInType: 'number',
    required: true
  });
};
const permissions = [
  ['accounts.all', 'Manage accounts'],
  ['prospects.all', 'Manage prospects'],
  ['sequences.all', 'Manage sequences'],
  ['sequenceStates.all', 'Manage sequence enrollments'],
  ['tasks.all', 'Manage tasks'],
  ['opportunities.all', 'Manage opportunities'],
  ['opportunityStages.read', 'Discover opportunity stages'],
  ['templates.all', 'Manage email templates'],
  ['snippets.all', 'Manage snippets'],
  ['calls.all', 'Log and read calls'],
  ['mailings.read', 'Read email delivery and engagement'],
  ['mailboxes.read', 'Discover sending mailboxes'],
  ['users.read', 'Discover users'],
  ['callDispositions.read', 'Discover call dispositions'],
  ['callPurposes.read', 'Discover call purposes'],
  ['stages.read', 'Discover prospect stages'],
  ['sequenceSteps.read', 'Read sequence steps before enrollment']
] as const;
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.outreach.io/api/oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes and governance',
        url: 'https://developers.outreach.io/api/getting-started#authorization'
      }
    ],
    scopes: permissions.map(([scope, title]) => ({ scope, title })),
    getAuthorizationUrl: async ctx => ({
      url: `${API_ORIGIN}/oauth/authorize?${new URLSearchParams({ client_id: ctx.clientId, redirect_uri: ctx.redirectUri, response_type: 'code', scope: ctx.scopes.join(' '), state: ctx.state })}`
    }),
    handleCallback: async ctx => ({
      output: await exchange({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        grant_type: 'authorization_code',
        code: ctx.code
      })
    }),
    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError('Reconnect Outreach; a refresh token is required.');
      return {
        output: await exchange({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        })
      };
    }
    // The current REST reference does not document a current-user endpoint or current=true user filter.
  });
