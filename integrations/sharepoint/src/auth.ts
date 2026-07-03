import {
  MICROSOFT_GRAPH_BASE,
  MICROSOFT_LOGIN_BASE,
  normalizeMicrosoftRedirectUri
} from '@slates/oauth-microsoft';
import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  requestAxiosData,
  SlateAuth
} from 'slates';
import { z } from 'zod';

type MicrosoftTokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  token_type?: unknown;
  scope?: unknown;
};

type SharePointAuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  tenantId?: string;
  sharepointToken?: string;
  sharepointRefreshToken?: string;
  sharepointExpiresAt?: string;
  sharepointHostname?: string;
};

type OAuthContextBase = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
};

type TokenRefreshContext = {
  output: SharePointAuthOutput;
  clientId: string;
  clientSecret: string;
  scopes: string[];
};

let scopes = [
  {
    title: 'Sites Read',
    description: 'Read items in all site collections',
    scope: 'Sites.Read.All'
  },
  {
    title: 'Sites Read Write',
    description: 'Read and write items in all site collections',
    scope: 'Sites.ReadWrite.All'
  },
  {
    title: 'Sites Manage',
    description: 'Create, edit, and delete items and lists in all site collections',
    scope: 'Sites.Manage.All'
  },
  {
    title: 'Sites Full Control',
    description: 'Full control of all site collections',
    scope: 'Sites.FullControl.All'
  },
  {
    title: 'Files Read',
    description: 'Read all files that user can access',
    scope: 'Files.Read.All'
  },
  {
    title: 'Files Read Write',
    description: 'Read and write all files that user can access',
    scope: 'Files.ReadWrite.All'
  },
  {
    title: 'User Read',
    description: 'Read user profile',
    scope: 'User.Read'
  },
  {
    title: 'Offline Access',
    description:
      'Maintain access to data you have given it access to (enables refresh tokens)',
    scope: 'offline_access'
  }
];

let serviceError = (message: string, reason = 'sharepoint_auth_error') =>
  createApiServiceError(message, { reason });

let microsoftAuthError = (error: unknown, operation = 'Microsoft auth request') =>
  buildApiServiceError(error, {
    providerLabel: 'Microsoft identity platform',
    reason: 'microsoft_identity_api_error',
    operation,
    detailKeys: ['error', 'error_description', 'message', 'trace_id', 'correlation_id'],
    nestedKeys: ['error', 'details', 'errors']
  });

let graphApiError = (error: unknown, operation = 'Microsoft Graph request') =>
  buildApiServiceError(error, {
    providerLabel: 'Microsoft Graph',
    reason: 'microsoft_graph_api_error',
    operation,
    detailKeys: ['message', 'error', 'code'],
    nestedKeys: ['error', 'details', 'errors']
  });

let normalizeTenant = (tenant: string) => tenant.replace(/^\/+|\/+$/g, '') || 'common';

let tokenHttp = (tenant: string) =>
  createAxios({
    baseURL: `${MICROSOFT_LOGIN_BASE}/${encodeURIComponent(normalizeTenant(tenant))}/oauth2/v2.0`
  });

let graphHttp = (token: string) =>
  createAxios({
    baseURL: MICROSOFT_GRAPH_BASE,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  });

let requestToken = (
  tenant: string,
  operation: string,
  body: URLSearchParams
): Promise<MicrosoftTokenResponse> =>
  requestAxiosData<MicrosoftTokenResponse>(
    operation,
    () =>
      tokenHttp(tenant).post('/token', body.toString(), {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }),
    error => microsoftAuthError(error, operation)
  );

let normalizeToken = (
  data: MicrosoftTokenResponse,
  options: { operation: string; previousRefreshToken?: string }
) =>
  normalizeOAuthTokenResponse(data, {
    providerLabel: 'Microsoft',
    operation: options.operation,
    previousRefreshToken: options.previousRefreshToken,
    refreshTokenFallbackMode: 'falsy'
  });

let isSharePointResourceScope = (scope: string) =>
  /^https:\/\/[^/]+\.sharepoint\.com\/\.default$/i.test(scope);

let graphScopeParam = (rawScopes: string[]) =>
  rawScopes.filter(scope => !isSharePointResourceScope(scope)).join(' ');

let identityScopes = (rawScopes: string[]) =>
  rawScopes.filter(scope => ['offline_access', 'openid', 'profile', 'email'].includes(scope));

let unique = (values: string[]) => [...new Set(values.filter(Boolean))];

let sharepointScopeParam = (hostname: string, rawScopes: string[]) =>
  unique([`https://${hostname}/.default`, ...identityScopes(rawScopes)]).join(' ');

let getHostnameFromWebUrl = (webUrl: string) => {
  try {
    return new URL(webUrl).hostname;
  } catch (error) {
    throw createApiServiceError(
      'Microsoft Graph returned an invalid SharePoint webUrl for the root site.',
      {
        reason: 'sharepoint_root_site_web_url_invalid',
        parent: error
      }
    );
  }
};

let getGraphRootSiteHostname = async (token: string) => {
  let site = await requestAxiosData<{
    webUrl?: unknown;
    siteCollection?: { hostname?: unknown };
  }>(
    'get root SharePoint site',
    () => graphHttp(token).get('/sites/root'),
    error => graphApiError(error, 'get root SharePoint site')
  );

  if (typeof site.siteCollection?.hostname === 'string' && site.siteCollection.hostname) {
    return site.siteCollection.hostname;
  }

  if (typeof site.webUrl === 'string' && site.webUrl) {
    return getHostnameFromWebUrl(site.webUrl);
  }

  throw serviceError(
    'Microsoft Graph did not return a SharePoint hostname for the root site.',
    'sharepoint_hostname_missing'
  );
};

let exchangeRefreshTokenForSharePoint = async (params: {
  tenant: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  hostname: string;
  scopes: string[];
  previousRefreshToken?: string;
}) => {
  let operation = 'SharePoint REST token exchange';
  let data = await requestToken(
    params.tenant,
    operation,
    new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      refresh_token: params.refreshToken,
      grant_type: 'refresh_token',
      scope: sharepointScopeParam(params.hostname, params.scopes)
    })
  );

  return normalizeToken(data, {
    operation,
    previousRefreshToken: params.previousRefreshToken ?? params.refreshToken
  });
};

let exchangeAuthorizationCodeForGraph = async (
  tenant: string,
  ctx: OAuthContextBase & { code: string }
) => {
  let operation = 'Microsoft Graph authorization code exchange';
  let data = await requestToken(
    tenant,
    operation,
    new URLSearchParams({
      client_id: ctx.clientId,
      client_secret: ctx.clientSecret,
      code: ctx.code,
      redirect_uri: normalizeMicrosoftRedirectUri(ctx.redirectUri),
      grant_type: 'authorization_code',
      scope: graphScopeParam(ctx.scopes)
    })
  );

  return normalizeToken(data, { operation });
};

let refreshGraphToken = async (tenant: string, ctx: TokenRefreshContext) => {
  if (!ctx.output.refreshToken) {
    throw serviceError(
      'Cannot refresh SharePoint auth without a Microsoft refresh token. Reconnect SharePoint with offline_access enabled.',
      'sharepoint_refresh_token_missing'
    );
  }

  let operation = 'Microsoft Graph token refresh';
  let data = await requestToken(
    tenant,
    operation,
    new URLSearchParams({
      client_id: ctx.clientId,
      client_secret: ctx.clientSecret,
      refresh_token: ctx.output.refreshToken,
      grant_type: 'refresh_token',
      scope: graphScopeParam(ctx.scopes)
    })
  );

  return normalizeToken(data, {
    operation,
    previousRefreshToken: ctx.output.refreshToken
  });
};

let createOutput = async (
  tenant: string,
  ctx: Pick<OAuthContextBase, 'clientId' | 'clientSecret' | 'scopes'>,
  graphToken: ReturnType<typeof normalizeToken>,
  previousSharePointRefreshToken?: string
): Promise<SharePointAuthOutput> => {
  if (!graphToken.refreshToken) {
    throw serviceError(
      'Microsoft OAuth did not return a refresh token. Reconnect with offline_access enabled.',
      'sharepoint_refresh_token_missing'
    );
  }

  let sharepointHostname = await getGraphRootSiteHostname(graphToken.token);
  let sharepointToken = await exchangeRefreshTokenForSharePoint({
    tenant,
    clientId: ctx.clientId,
    clientSecret: ctx.clientSecret,
    refreshToken: graphToken.refreshToken,
    hostname: sharepointHostname,
    scopes: ctx.scopes,
    previousRefreshToken: previousSharePointRefreshToken ?? graphToken.refreshToken
  });

  return {
    token: graphToken.token,
    refreshToken: graphToken.refreshToken,
    expiresAt: graphToken.expiresAt,
    tenantId: normalizeTenant(tenant),
    sharepointToken: sharepointToken.token,
    sharepointRefreshToken: sharepointToken.refreshToken,
    sharepointExpiresAt: sharepointToken.expiresAt,
    sharepointHostname
  };
};

let getProfile = async (output: SharePointAuthOutput) => {
  let user = await requestAxiosData<{
    id?: unknown;
    mail?: unknown;
    userPrincipalName?: unknown;
    displayName?: unknown;
  }>(
    'get Microsoft Graph profile',
    () => graphHttp(output.token).get('/me'),
    error => graphApiError(error, 'get Microsoft Graph profile')
  );

  return {
    profile: {
      id: typeof user.id === 'string' ? user.id : (output.sharepointHostname ?? 'sharepoint'),
      email:
        typeof user.mail === 'string'
          ? user.mail
          : typeof user.userPrincipalName === 'string'
            ? user.userPrincipalName
            : undefined,
      name:
        typeof user.displayName === 'string'
          ? user.displayName
          : (output.sharepointHostname ?? 'SharePoint'),
      tenantId: output.tenantId,
      sharepointHostname: output.sharepointHostname
    }
  };
};

let createMicrosoftOauth = (name: string, key: string, tenant: string) => ({
  type: 'auth.oauth' as const,
  name,
  key,
  scopes,
  docs: [
    {
      type: 'docs.auth.oauth' as const,
      name: 'Microsoft identity platform OAuth documentation',
      url: 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow'
    },
    {
      type: 'docs.auth.oauth_scopes' as const,
      name: 'Microsoft Graph and SharePoint OAuth scopes',
      url: 'https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc'
    }
  ],

  getAuthorizationUrl: async (ctx: {
    clientId: string;
    redirectUri: string;
    scopes: string[];
    state: string;
  }) => {
    let resolvedTenant = normalizeTenant(tenant);
    let params = new URLSearchParams({
      client_id: ctx.clientId,
      response_type: 'code',
      redirect_uri: normalizeMicrosoftRedirectUri(ctx.redirectUri),
      scope: graphScopeParam(ctx.scopes),
      state: ctx.state,
      response_mode: 'query'
    });

    return {
      url: `${MICROSOFT_LOGIN_BASE}/${encodeURIComponent(resolvedTenant)}/oauth2/v2.0/authorize?${params.toString()}`
    };
  },

  handleCallback: async (ctx: OAuthContextBase & { code: string }) => {
    let resolvedTenant = normalizeTenant(tenant);
    let graphToken = await exchangeAuthorizationCodeForGraph(resolvedTenant, ctx);
    let output = await createOutput(resolvedTenant, ctx, graphToken);

    return {
      output,
      scopes: unique([
        ...ctx.scopes,
        ...identityScopes(ctx.scopes),
        output.sharepointHostname ? `https://${output.sharepointHostname}/.default` : ''
      ])
    };
  },

  handleTokenRefresh: async (ctx: TokenRefreshContext) => {
    let resolvedTenant = normalizeTenant(tenant);
    let graphToken = await refreshGraphToken(resolvedTenant, ctx);

    return {
      output: await createOutput(
        resolvedTenant,
        ctx,
        graphToken,
        ctx.output.sharepointRefreshToken
      )
    };
  },

  getProfile: async (ctx: { output: SharePointAuthOutput }) => getProfile(ctx.output)
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Microsoft Graph OAuth access token.'),
      refreshToken: z.string().optional().describe('Microsoft Graph OAuth refresh token.'),
      expiresAt: z.string().optional().describe('Microsoft Graph token expiration time.'),
      tenantId: z.string().optional().describe('Microsoft tenant used for OAuth.'),
      sharepointToken: z
        .string()
        .optional()
        .describe('SharePoint REST OAuth access token for the tenant SharePoint host.'),
      sharepointRefreshToken: z
        .string()
        .optional()
        .describe('SharePoint REST OAuth refresh token.'),
      sharepointExpiresAt: z
        .string()
        .optional()
        .describe('SharePoint REST token expiration time.'),
      sharepointHostname: z
        .string()
        .optional()
        .describe('SharePoint hostname the REST token is scoped to.')
    })
  )
  .addOauth(createMicrosoftOauth('Work & Personal', 'oauth_common', 'common'))
  .addOauth(createMicrosoftOauth('Work Only', 'oauth_organizations', 'organizations'));
