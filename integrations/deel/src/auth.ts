import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  requestAxiosData,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { deelError } from './lib/errors';
import { objectResponse, requireText } from './lib/response';

let exchangeToken = async (
  clientId: string,
  clientSecret: string,
  values: Record<string, string>,
  previousRefreshToken?: string
) => {
  requireText(clientId, 'OAuth client ID');
  requireText(clientSecret, 'OAuth client secret');
  let http = createAxios({ baseURL: 'https://app.deel.com', timeout: 30000, maxRedirects: 0 });
  let data = objectResponse(
    await requestAxiosData(
      'OAuth token exchange',
      () =>
        http.post('/oauth2/tokens', new URLSearchParams(values).toString(), {
          headers: {
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }),
      deelError
    ),
    'OAuth token'
  );
  let seconds = Number(data.expires_in);
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    !Number.isFinite(new Date(Date.now() + seconds * 1000).getTime())
  )
    throw createApiServiceError(
      'Deel returned an invalid OAuth token expiry. Reconnect the account.',
      { reason: 'oauth_token_response' }
    );
  let output = normalizeOAuthTokenResponse(data, {
    providerLabel: 'Deel',
    required: true,
    previousRefreshToken
  });
  requireText(output.token, 'OAuth access token');
  requireText(output.refreshToken, 'OAuth refresh token');
  return output;
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      clientId: z.string().optional(),
      redirectUri: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth2',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developer.deel.com/api/stable/oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developer.deel.com/api/stable/authentication#available-scopes'
      }
    ],

    scopes: [
      { title: 'Contracts Read', description: 'Read contract data', scope: 'contracts:read' },
      {
        title: 'Contracts Write',
        description: 'Create and modify contracts',
        scope: 'contracts:write'
      },
      { title: 'People Read', description: 'Read people/worker data', scope: 'people:read' },
      {
        title: 'Timesheets Read',
        description: 'Read timesheet data',
        scope: 'timesheets:read'
      },
      {
        title: 'Timesheets Write',
        description: 'Create and manage timesheets',
        scope: 'timesheets:write'
      },
      {
        title: 'Time Off Read',
        description: 'Read time-off requests',
        scope: 'time-off:read'
      },
      {
        title: 'Time Off Write',
        description: 'Create and manage time-off requests',
        scope: 'time-off:write'
      },
      {
        title: 'Invoice Adjustments Read',
        description: 'Read invoice adjustments',
        scope: 'invoice-adjustments:read'
      },
      {
        title: 'Invoice Adjustments Write',
        description: 'Create and manage invoice adjustments',
        scope: 'invoice-adjustments:write'
      },
      {
        title: 'Accounting Read',
        description: 'Read accounting and billing data',
        scope: 'accounting:read'
      },
      {
        title: 'Organizations Read',
        description: 'Read organization data',
        scope: 'organizations:read'
      },
      { title: 'Workers Read', description: 'Read worker profiles', scope: 'worker:read' },
      { title: 'Workers Write', description: 'Modify worker profiles', scope: 'worker:write' }
    ],

    getAuthorizationUrl: async ctx => {
      requireText(ctx.clientId, 'OAuth client ID');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        response_type: 'code'
      });
      return { url: `https://app.deel.com/oauth2/authorize?${params}` };
    },
    handleCallback: async ctx => ({
      output: {
        ...(await exchangeToken(ctx.clientId, ctx.clientSecret, {
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        })),
        clientId: ctx.clientId,
        redirectUri: ctx.redirectUri
      }
    }),
    handleTokenRefresh: async (ctx: {
      clientId: string;
      clientSecret: string;
      output: {
        token: string;
        refreshToken?: string;
        expiresAt?: string;
        clientId?: string;
        redirectUri?: string;
      };
    }) => {
      let refreshToken = requireText(
        ctx.output.refreshToken,
        'Refresh token; reconnect Deel if it is missing'
      );
      // Older saved connections have no redirect URI; retain their previously supported refresh payload.
      let redirectUri = ctx.output.redirectUri;
      if (redirectUri !== undefined) requireText(redirectUri, 'OAuth redirect URI');
      return {
        output: {
          ...(await exchangeToken(
            ctx.clientId,
            ctx.clientSecret,
            {
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
              ...(redirectUri ? { redirect_uri: redirectUri } : {})
            },
            refreshToken
          )),
          clientId: ctx.clientId,
          redirectUri
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      apiToken: z.string().describe('Deel API token (personal or organization token)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: requireText(ctx.input.apiToken, 'Deel API token')
        }
      };
    }
  });
