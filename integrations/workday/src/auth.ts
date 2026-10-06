import {
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth,
  type SlateAuthWithOauth
} from 'slates';
import { z } from 'zod';
import {
  authEndpoint,
  identifier,
  origin,
  record,
  reject,
  string,
  upstreamError
} from './lib/contracts';

type OAuthInput = { baseUrl: string; tenant: string; authorizationUrl?: string };
type RefreshContext = Parameters<
  NonNullable<
    SlateAuthWithOauth<OAuthInput, import('./lib/contracts').WorkdayAuth>['handleTokenRefresh']
  >
>[0];
const scopes = [
  {
    title: 'Staffing',
    description: 'Read authorized worker and organization information.',
    scope: 'Staffing'
  },
  {
    title: 'Tenant Non-Configurable',
    description: 'Access authorized inbox tasks.',
    scope: 'Tenant Non-Configurable'
  },
  {
    title: 'Time Off and Leave',
    description: 'Read time-off information and submit authorized requests.',
    scope: 'Time Off and Leave'
  },
  {
    title: 'Time Tracking',
    description: 'Read authorized recorded time blocks.',
    scope: 'Time Tracking'
  },
  {
    title: 'WQL',
    description: 'Query data permitted by the connected account.',
    scope: 'System'
  }
];
const connection = (input: { baseUrl: string; tenant: string; authorizationUrl?: string }) => {
  const tenant = identifier(input.tenant, 'Tenant');
  if (!/^[A-Za-z0-9_-]+$/.test(tenant))
    reject(
      'Tenant must be the name shown in your Workday endpoint, using letters, digits, underscores or hyphens.'
    );
  return {
    baseUrl: origin(input.baseUrl),
    tenant,
    ...(input.authorizationUrl === undefined
      ? {}
      : { authorizationUrl: authEndpoint(input.authorizationUrl, tenant) })
  };
};
const exchange = async (
  input: ReturnType<typeof connection>,
  clientId: string,
  clientSecret: string,
  params: URLSearchParams,
  previousRefreshToken?: string
) => {
  const basic = Buffer.from(
    `${string(clientId, 'OAuth client ID')}:${string(clientSecret, 'OAuth client secret')}`
  ).toString('base64');
  const ax = createAuthenticatedAxios({
    baseURL: input.baseUrl,
    authHeader: { value: `Basic ${basic}` },
    contentType: 'application/x-www-form-urlencoded',
    timeout: 30000,
    maxRedirects: 0
  });
  let data: unknown;
  try {
    data = (
      await ax.post(`/ccx/oauth2/${encodeURIComponent(input.tenant)}/token`, params.toString())
    ).data;
  } catch (error) {
    throw upstreamError(error, 'token exchange');
  }
  const body = record(data);
  if (
    body.expires_in !== undefined &&
    (typeof body.expires_in !== 'number' ||
      !Number.isFinite(body.expires_in) ||
      body.expires_in <= 0 ||
      body.expires_in > 31536000)
  )
    reject('Workday returned an invalid token lifetime. Reconnect the account.');
  if (
    body.token_type !== undefined &&
    (typeof body.token_type !== 'string' || body.token_type.toLowerCase() !== 'bearer')
  )
    reject('Workday returned an unsupported token type.');
  if (
    body.refresh_token !== undefined &&
    (typeof body.refresh_token !== 'string' || !body.refresh_token.trim())
  )
    reject('Workday returned an invalid refresh token.');
  const tokens = normalizeOAuthTokenResponse(body, {
    providerLabel: 'Workday',
    previousRefreshToken,
    expiresInType: 'number'
  });
  if (/\s/.test(tokens.token) || (tokens.refreshToken && /\s/.test(tokens.refreshToken)))
    reject('Workday returned malformed credentials.');
  return { ...tokens, ...input };
};
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      baseUrl: z.string().optional(),
      tenant: z.string().optional(),
      authorizationUrl: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',
    scopes,
    inputSchema: z.object({
      baseUrl: z
        .string()
        .describe(
          'Workday HTTPS service origin from View API Clients, such as https://wd2-services1.myworkday.com; omit the API path.'
        ),
      tenant: z.string().describe('Tenant name shown in your Workday API endpoint.'),
      authorizationUrl: z
        .string()
        .optional()
        .describe(
          'Provider-issued OAuth authorization endpoint from View API Clients, such as https://wd2.myworkday.com/tenant/authorize. Required to start a new connection; the authorization host can differ from the service host.'
        )
    }),
    getAuthorizationUrl: async ctx => {
      const input = connection(ctx.input);
      if (!input.authorizationUrl)
        reject(
          'Copy the authorization endpoint from View API Clients into authorizationUrl before connecting. The service origin is not the authorization endpoint.'
        );
      const url = new URL(input.authorizationUrl);
      url.search = new URLSearchParams({
        client_id: string(ctx.clientId, 'OAuth client ID'),
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        scope: (ctx.scopes.length ? ctx.scopes : scopes.map(scope => scope.scope)).join(' ')
      }).toString();
      return { url: url.toString(), input };
    },
    handleCallback: async ctx => {
      const input = connection(ctx.input);
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: string(ctx.code, 'Authorization code'),
        redirect_uri: ctx.redirectUri
      });
      return { output: await exchange(input, ctx.clientId, ctx.clientSecret, params), input };
    },
    handleTokenRefresh: async (ctx: RefreshContext) => {
      if (!ctx.output.refreshToken)
        reject(
          'This Workday connection has no refresh token. Reconnect using an API client that permits refresh tokens.'
        );
      const input = connection(ctx.input);
      if (
        (ctx.output.baseUrl && ctx.output.baseUrl !== input.baseUrl) ||
        (ctx.output.tenant && ctx.output.tenant !== input.tenant) ||
        (ctx.output.authorizationUrl && ctx.output.authorizationUrl !== input.authorizationUrl)
      )
        reject('The saved Workday tenant binding changed. Reconnect the account.');
      return {
        output: await exchange(
          input,
          ctx.clientId,
          ctx.clientSecret,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: string(ctx.output.refreshToken, 'Refresh token')
          }),
          ctx.output.refreshToken
        ),
        input
      };
    }
  });
