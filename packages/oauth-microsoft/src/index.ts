import { createApiServiceError, createAxios, getApiErrorResponseWithBody } from 'slates';

export let MICROSOFT_LOGIN_BASE = 'https://login.microsoftonline.com';
export let MICROSOFT_GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
let MICROSOFT_GRAPH_RESOURCE = 'https://graph.microsoft.com';

// Microsoft documents this as the Azure DevOps resource ID used when issuing
// Entra access tokens.
// https://learn.microsoft.com/en-us/azure/devops/cli/entra-tokens?view=azure-devops
let AZURE_DEVOPS_RESOURCE = '499b84ac-1321-427f-aa17-267ca6975798';
let SECONDS_TO_MS = 1000;

let OIDC_SCOPES = new Set(['openid', 'profile', 'email', 'offline_access']);
let MICROSOFT_TENANT_PATTERN =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})$/i;
// AADSTS700016: app not in directory; AADSTS7000229: no service principal.
let APP_NOT_IN_TENANT_ERROR_CODES = [700016, 7000229];
let ADMIN_CONSENT_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000];

let wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type MicrosoftOauthScope = {
  title: string;
  description: string;
  scope: string;
};

export type MicrosoftOauthDocsReference = {
  type?: 'docs.auth.oauth' | 'docs.auth.oauth_scopes';
  name: string;
  url: string;
};

export type MicrosoftGraphProfile = {
  id?: string;
  email?: string;
  name?: string;
  imageUrl?: string;
};

export type MicrosoftGraphProfileOptions = {
  baseURL: string;
  path: string;
  mapProfile: (data: unknown) => MicrosoftGraphProfile;
};

export type MicrosoftGraphOauthOptions = {
  name: string;
  key: string;
  tenant: string;
  scopes: MicrosoftOauthScope[];
  docs?: MicrosoftOauthDocsReference[];
  allowTenantInput?: boolean;
  missingRefreshTokenMessage?: string;
  /** Normalize loopback redirect URIs for Microsoft app registration compatibility. */
  normalizeRedirectUri?: boolean;
  /** Transforms the raw scope list before it is sent to the token endpoint. */
  scopeMapper?: (scopes: string[]) => string[];
  /** Scopes appended after mapping (e.g. `offline_access` for Azure DevOps). */
  extraScopes?: string[];
  /** When no refresh token is stored, throw (default) or preserve the existing output. */
  onMissingRefreshToken?: 'throw' | 'preserve';
  /** Custom profile endpoint. Defaults to Microsoft Graph `/me`. */
  profile?: MicrosoftGraphProfileOptions;
  /** Lets a Microsoft Entra admin grant tenant-wide consent before users connect. */
  adminConsent?: boolean;
};

export type MicrosoftGraphOauthInput = {
  tenantId?: unknown;
};

export type MicrosoftGraphAuthorizationUrlContext = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  input?: MicrosoftGraphOauthInput;
};

export type MicrosoftGraphCallbackContext = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  code: string;
  input?: MicrosoftGraphOauthInput;
};

export type MicrosoftGraphOauthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
};

export type MicrosoftGraphTokenRefreshContext = {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  input?: MicrosoftGraphOauthInput;
  output: MicrosoftGraphOauthOutput;
};

export type MicrosoftGraphProfileContext = {
  output: {
    token: string;
  };
};

type MicrosoftTokenErrorResponse = {
  error?: string;
  error_description?: string;
  error_codes?: number[];
};

type MicrosoftTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

let MICROSOFT_GRAPH_TEXT_LIKE_FILE_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.xml',
  '.html',
  '.htm',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.css',
  '.svg',
  '.yaml',
  '.yml'
]);

let MICROSOFT_GRAPH_BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

let getMicrosoftTokenOutput = (
  data: MicrosoftTokenResponse,
  currentRefreshToken?: string
): MicrosoftGraphOauthOutput => ({
  token: data.access_token,
  refreshToken: data.refresh_token ?? currentRefreshToken,
  expiresAt: data.expires_in
    ? new Date(Date.now() + data.expires_in * SECONDS_TO_MS).toISOString()
    : undefined
});

let hasTextLikeFileExtension = (fileName: string) => {
  let dotIndex = fileName.lastIndexOf('.');
  return (
    dotIndex >= 0 &&
    MICROSOFT_GRAPH_TEXT_LIKE_FILE_EXTENSIONS.has(fileName.slice(dotIndex).toLowerCase())
  );
};

let isTextLikeContentType = (contentType?: string) => {
  if (!contentType) {
    return false;
  }

  let normalized = contentType.toLowerCase();
  if (normalized.includes('openxmlformats-officedocument')) {
    return false;
  }

  return (
    normalized.startsWith('text/') ||
    ['json', 'xml', 'javascript', 'typescript', 'svg', 'x-www-form-urlencoded'].some(
      fragment => normalized.includes(fragment)
    )
  );
};

let looksLikeBase64 = (content: string) => {
  let normalized = content.replace(/\s+/g, '');
  return (
    !!normalized &&
    normalized.length % 4 === 0 &&
    MICROSOFT_GRAPH_BASE64_PATTERN.test(normalized)
  );
};

export let MICROSOFT_OAUTH_INTEGRATION_KEYS = new Set([
  'azure-blob-storage',
  'azure-devops',
  'azure-functions',
  'azure-repos',
  'dynamics-365',
  'excel-online',
  'microsoft-fabric',
  'microsoft-teams',
  'onedrive',
  'onenote',
  'outlook',
  'power-bi',
  'powerpoint-online',
  'sharepoint',
  'superhuman-microsoft365',
  'word-online'
]);

export let usesMicrosoftOAuth = (integration: string) =>
  MICROSOFT_OAUTH_INTEGRATION_KEYS.has(integration);

export let normalizeMicrosoftRedirectUri = (redirectUri: string) => {
  let url = new URL(redirectUri);
  if (url.protocol === 'http:' && url.hostname === '127.0.0.1') {
    url.hostname = 'localhost';
  }

  return url.toString();
};

export let normalizeMicrosoftRedirectUriForIntegration = (
  integration: string,
  redirectUri: string
) =>
  usesMicrosoftOAuth(integration) ? normalizeMicrosoftRedirectUri(redirectUri) : redirectUri;

export let resolveMicrosoftTenant = (tenantId: unknown, defaultTenant: string) => {
  if (typeof tenantId !== 'string') {
    return defaultTenant;
  }

  let normalizedTenant = tenantId.trim();
  return normalizedTenant || defaultTenant;
};

export let mapAzureDevOpsScopes = (scopes: string[]) =>
  scopes.map(scope => `${AZURE_DEVOPS_RESOURCE}/${scope}`);

export let buildMicrosoftGraphUploadBody = (
  fileName: string,
  content: string,
  contentType?: string
) => {
  if (
    isTextLikeContentType(contentType) ||
    hasTextLikeFileExtension(fileName) ||
    !looksLikeBase64(content)
  ) {
    return content;
  }

  return Buffer.from(content.replace(/\s+/g, ''), 'base64');
};

let defaultGraphProfile: MicrosoftGraphProfileOptions = {
  baseURL: MICROSOFT_GRAPH_BASE,
  path: '/me',
  mapProfile: data => {
    let user = (data ?? {}) as {
      id?: string;
      mail?: string;
      userPrincipalName?: string;
      displayName?: string;
    };

    return {
      id: user.id,
      email: user.mail || user.userPrincipalName,
      name: user.displayName
    };
  }
};

let tokenClientCache = new Map<string, ReturnType<typeof createAxios>>();
let getCachedTokenClient = (resolvedTenant: string) => {
  let cached = tokenClientCache.get(resolvedTenant);
  if (cached) return cached;

  let client = createAxios({
    baseURL: `${MICROSOFT_LOGIN_BASE}/${resolvedTenant}/oauth2/v2.0`
  });
  tokenClientCache.set(resolvedTenant, client);
  return client;
};

export let createMicrosoftGraphOauth = ({
  name,
  key,
  tenant,
  scopes,
  docs,
  allowTenantInput = false,
  missingRefreshTokenMessage = 'No refresh token available. Ensure offline_access scope is requested.',
  normalizeRedirectUri: shouldNormalizeRedirectUri = false,
  scopeMapper,
  extraScopes,
  onMissingRefreshToken = 'throw',
  profile = defaultGraphProfile,
  adminConsent = false
}: MicrosoftGraphOauthOptions) => {
  let profileAxios = createAxios({ baseURL: profile.baseURL });

  let getTenant = (ctx: { input?: MicrosoftGraphOauthInput }) =>
    allowTenantInput ? resolveMicrosoftTenant(ctx.input?.tenantId, tenant) : tenant;

  let getRedirectUri = (redirectUri: string) =>
    shouldNormalizeRedirectUri ? normalizeMicrosoftRedirectUri(redirectUri) : redirectUri;

  let mapScopes = (rawScopes: string[]) => {
    let mapped = scopeMapper ? scopeMapper(rawScopes) : rawScopes;
    return extraScopes ? [...mapped, ...extraScopes] : mapped;
  };

  let buildScopeParam = (rawScopes: string[]) => mapScopes(rawScopes).join(' ');

  // v2 admin consent only accepts fully qualified scopes, so bare ones get the Graph prefix.
  let buildAdminConsentScopeParam = (rawScopes: string[]) => {
    let resourceScopes = mapScopes(rawScopes)
      .filter(scope => !OIDC_SCOPES.has(scope.toLowerCase()))
      .map(scope => (scope.includes('/') ? scope : `${MICROSOFT_GRAPH_RESOURCE}/${scope}`));

    return (
      resourceScopes.length ? resourceScopes : [`${MICROSOFT_GRAPH_RESOURCE}/.default`]
    ).join(' ');
  };

  // Entra replicates the service principal admin consent creates with a delay, so retry until
  // client credentials stop failing with app-not-in-tenant.
  let verifyAdminConsent = async (ctx: {
    clientId: string;
    clientSecret: string;
    tenant?: string;
  }) => {
    let consentTenant = ctx.tenant?.trim() ?? '';
    if (!MICROSOFT_TENANT_PATTERN.test(consentTenant)) {
      throw createApiServiceError(
        'Admin consent could not be verified: Microsoft returned an invalid tenant.'
      );
    }

    for (let attempt = 0; ; attempt++) {
      try {
        await getCachedTokenClient(consentTenant).post(
          '/token',
          new URLSearchParams({
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            grant_type: 'client_credentials',
            scope: `${MICROSOFT_GRAPH_RESOURCE}/.default`
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
        return;
      } catch (error) {
        let body = (getApiErrorResponseWithBody(error)?.data ??
          {}) as MicrosoftTokenErrorResponse;
        let appNotInTenantCode = APP_NOT_IN_TENANT_ERROR_CODES.find(
          code =>
            body.error_codes?.includes(code) ||
            body.error_description?.includes(`AADSTS${code}:`)
        );

        if (appNotInTenantCode) {
          let retryDelay = ADMIN_CONSENT_RETRY_DELAYS_MS[attempt];
          if (retryDelay !== undefined) {
            await wait(retryDelay);
            continue;
          }

          throw createApiServiceError(
            'Admin consent could not be verified: the app is not registered in this Microsoft Entra tenant. Ask the admin to grant consent again.',
            { upstreamCode: `AADSTS${appNotInTenantCode}`, parent: error }
          );
        }

        throw createApiServiceError(
          `Admin consent could not be verified: ${
            body.error_description ||
            (error instanceof Error ? error.message : 'token request failed')
          }`,
          { upstreamCode: body.error, parent: error }
        );
      }
    }
  };

  let adminSetup = {
    getAuthorizationUrl: async (ctx: MicrosoftGraphAuthorizationUrlContext) => {
      let resolvedTenant = getTenant(ctx);
      // Admin consent rejects the `common` tenant.
      let adminTenant = resolvedTenant === 'common' ? 'organizations' : resolvedTenant;
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: getRedirectUri(ctx.redirectUri),
        state: ctx.state,
        scope: buildAdminConsentScopeParam(ctx.scopes)
      });

      return {
        url: `${MICROSOFT_LOGIN_BASE}/${adminTenant}/v2.0/adminconsent?${params.toString()}`
      };
    },

    handleCallback: async (ctx: {
      clientId: string;
      clientSecret: string;
      callbackParams?: Record<string, string>;
    }) => {
      let callbackParams = ctx.callbackParams ?? {};

      if (callbackParams.error) {
        throw createApiServiceError(
          callbackParams.error_description ||
            `Microsoft admin consent failed: ${callbackParams.error}`,
          { upstreamCode: callbackParams.error }
        );
      }

      if (callbackParams.admin_consent?.toLowerCase() !== 'true') {
        throw createApiServiceError(
          'Microsoft did not confirm that admin consent was granted.'
        );
      }

      await verifyAdminConsent({
        clientId: ctx.clientId,
        clientSecret: ctx.clientSecret,
        tenant: callbackParams.tenant
      });

      return {};
    }
  };

  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,
    docs,
    ...(adminConsent ? { adminSetup } : {}),

    getAuthorizationUrl: async (ctx: MicrosoftGraphAuthorizationUrlContext) => {
      let resolvedTenant = getTenant(ctx);
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: getRedirectUri(ctx.redirectUri),
        scope: buildScopeParam(ctx.scopes),
        state: ctx.state,
        response_mode: 'query'
      });

      return {
        url: `${MICROSOFT_LOGIN_BASE}/${resolvedTenant}/oauth2/v2.0/authorize?${params.toString()}`
      };
    },

    handleCallback: async (ctx: MicrosoftGraphCallbackContext) => {
      let tokenClient = getCachedTokenClient(getTenant(ctx));
      let response = await tokenClient.post(
        '/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: getRedirectUri(ctx.redirectUri),
          grant_type: 'authorization_code',
          scope: buildScopeParam(ctx.scopes)
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      return {
        output: getMicrosoftTokenOutput(response.data as MicrosoftTokenResponse)
      };
    },

    handleTokenRefresh: async (ctx: MicrosoftGraphTokenRefreshContext) => {
      if (!ctx.output.refreshToken) {
        if (onMissingRefreshToken === 'preserve') {
          return { output: ctx.output };
        }
        throw new Error(missingRefreshTokenMessage);
      }

      let tokenClient = getCachedTokenClient(getTenant(ctx));
      let response = await tokenClient.post(
        '/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken,
          grant_type: 'refresh_token',
          scope: buildScopeParam(ctx.scopes)
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      return {
        output: getMicrosoftTokenOutput(
          response.data as MicrosoftTokenResponse,
          ctx.output.refreshToken
        )
      };
    },

    getProfile: async (ctx: MicrosoftGraphProfileContext) => {
      let response = await profileAxios.get(profile.path, {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      return { profile: profile.mapProfile(response.data) };
    }
  };
};
