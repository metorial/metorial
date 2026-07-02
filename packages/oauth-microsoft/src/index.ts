import { createAxios } from 'slates';

export let MICROSOFT_LOGIN_BASE = 'https://login.microsoftonline.com';
export let MICROSOFT_GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// Microsoft documents this as the Azure DevOps resource ID used when issuing
// Entra access tokens.
// https://learn.microsoft.com/en-us/azure/devops/cli/entra-tokens?view=azure-devops
let AZURE_DEVOPS_RESOURCE = '499b84ac-1321-427f-aa17-267ca6975798';
let SECONDS_TO_MS = 1000;

export type MicrosoftOauthScope = {
  title: string;
  description: string;
  scope: string;
  defaultChecked?: boolean;
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
  profile = defaultGraphProfile
}: MicrosoftGraphOauthOptions) => {
  let profileAxios = createAxios({ baseURL: profile.baseURL });

  let getTenant = (ctx: { input?: MicrosoftGraphOauthInput }) =>
    allowTenantInput ? resolveMicrosoftTenant(ctx.input?.tenantId, tenant) : tenant;

  let getRedirectUri = (redirectUri: string) =>
    shouldNormalizeRedirectUri ? normalizeMicrosoftRedirectUri(redirectUri) : redirectUri;

  let buildScopeParam = (rawScopes: string[]) => {
    let mapped = scopeMapper ? scopeMapper(rawScopes) : rawScopes;
    return extraScopes ? [...mapped, ...extraScopes].join(' ') : mapped.join(' ');
  };

  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,
    docs,

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
