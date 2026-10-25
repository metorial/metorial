import {
  createApiServiceError,
  createAxios,
  getApiErrorResponseWithBody,
  type SlateAuthWithOauth
} from 'slates';

export let MICROSOFT_LOGIN_BASE = 'https://login.microsoftonline.com';
export let MICROSOFT_GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
let MICROSOFT_GRAPH_RESOURCE = 'https://graph.microsoft.com';
let MICROSOFT_GRAPH_DEFAULT_SCOPE = `${MICROSOFT_GRAPH_RESOURCE}/.default`;

// Microsoft documents this as the Azure DevOps resource ID used when issuing
// Entra access tokens.
// https://learn.microsoft.com/en-us/azure/devops/cli/entra-tokens?view=azure-devops
let AZURE_DEVOPS_RESOURCE = '499b84ac-1321-427f-aa17-267ca6975798';
let SECONDS_TO_MS = 1000;

let OIDC_SCOPES = new Set(['openid', 'profile', 'email', 'offline_access']);
// Microsoft's fixed tenant ID for personal accounts, equivalent to the `consumers` alias.
let CONSUMERS_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad';
let CONSUMER_TENANTS = new Set(['consumers', CONSUMERS_TENANT_ID]);
let PERSONAL_ACCOUNT_TENANTS = new Set(['common', ...CONSUMER_TENANTS]);
let MICROSOFT_TENANT_ALIASES = new Set(['common', 'organizations', 'consumers']);
let MICROSOFT_TENANT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let MICROSOFT_TENANT_DOMAIN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
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
  /**
   * Lets `input.tenantId` override a `common` tenant; admin consent also falls back to
   * `config.tenantId`. An `organizations` tenant only accepts work or school overrides, so
   * `common` and `consumers` are ignored; any other tenant is never overridden. Overrides
   * that aren't a tenant ID, verified domain, or tenant alias are ignored for sign-in and
   * rejected for admin consent.
   */
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
  /**
   * Lets a Microsoft Entra admin grant tenant-wide consent to the requested scopes. Pass
   * `{ required: true }` when users can't connect until that consent exists.
   */
  adminConsent?: boolean | Pick<MicrosoftAdminConsentBaseOptions, 'required'>;
};

export type MicrosoftRequiredPermission = {
  /** API name as listed under **API permissions**, e.g. `Microsoft Graph`. */
  api: string;
  permissions: string[];
};

type MicrosoftAdminConsentBaseOptions = {
  tenant: string | ((ctx: MicrosoftTenantContext) => string);
  normalizeRedirectUri?: boolean;
  /** Extra markdown shown to the admin after the required permissions. */
  instructions?: string;
  required?: boolean;
};

export type MicrosoftAdminConsentOptions = MicrosoftAdminConsentBaseOptions &
  (
    | {
        /** Consents to the scopes the method requests (default). */
        mode?: 'requested-scopes';
        scopeMapper?: (scopes: string[]) => string[];
        requiredPermissions?: MicrosoftRequiredPermission[];
      }
    | {
        /**
         * Grants every API permission configured on the app registration, which is the only
         * option when the permissions span several resource apps.
         */
        mode: 'app-registration';
        requiredPermissions: MicrosoftRequiredPermission[];
      }
  );

type MicrosoftGraphOauthInput = {
  tenantId?: unknown;
};

export type MicrosoftGraphOauthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
};

type SlateOauthMethod<InputType extends {}> = SlateAuthWithOauth<
  InputType,
  MicrosoftGraphOauthOutput
>;
type SlateOauthHookContext<
  InputType extends {},
  Hook extends 'getAuthorizationUrl' | 'handleCallback' | 'handleTokenRefresh' | 'getProfile'
> = Parameters<NonNullable<SlateOauthMethod<InputType>[Hook]>>[0];
type SlateAdminSetupHooks = NonNullable<SlateOauthMethod<{}>['adminSetup']>;

type MicrosoftAdminConsentAuthorizationUrlContext = Pick<
  Parameters<NonNullable<SlateAdminSetupHooks['getAuthorizationUrl']>>[0],
  'clientId' | 'redirectUri' | 'scopes' | 'state' | 'input' | 'config'
>;

type SlateAdminCallbackContext = Parameters<
  NonNullable<SlateAdminSetupHooks['handleCallback']>
>[0];

type MicrosoftAdminConsentCallbackContext = Pick<
  SlateAdminCallbackContext,
  'clientId' | 'clientSecret' | 'callbackParams' | 'config'
> &
  Partial<Pick<SlateAdminCallbackContext, 'input'>>;

type MicrosoftTenantContext = Pick<MicrosoftAdminConsentAuthorizationUrlContext, 'config'> & {
  input?: MicrosoftGraphOauthInput;
};

type MicrosoftGraphAuthorizationUrlContext = Pick<
  SlateOauthHookContext<MicrosoftGraphOauthInput, 'getAuthorizationUrl'>,
  'clientId' | 'redirectUri' | 'scopes' | 'state' | 'input'
>;

type MicrosoftGraphCallbackContext = Pick<
  SlateOauthHookContext<MicrosoftGraphOauthInput, 'handleCallback'>,
  'clientId' | 'clientSecret' | 'redirectUri' | 'scopes' | 'code' | 'input'
>;

type MicrosoftGraphTokenRefreshContext = Pick<
  SlateOauthHookContext<MicrosoftGraphOauthInput, 'handleTokenRefresh'>,
  'clientId' | 'clientSecret' | 'scopes' | 'input' | 'output'
>;

type MicrosoftGraphProfileContext = Pick<
  SlateOauthHookContext<MicrosoftGraphOauthInput, 'getProfile'>,
  'output'
>;

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

let toTenantPathSegment = (tenant: string) => encodeURIComponent(tenant.trim());

export let microsoftOauthBaseUrl = (tenant: string) =>
  `${MICROSOFT_LOGIN_BASE}/${toTenantPathSegment(tenant)}/oauth2/v2.0`;

let isTenantId = (tenant: string) => MICROSOFT_TENANT_ID_PATTERN.test(tenant);

let isSpecificTenant = (tenant: string) =>
  isTenantId(tenant) || MICROSOFT_TENANT_DOMAIN_PATTERN.test(tenant);

let isValidTenant = (tenant: string) =>
  MICROSOFT_TENANT_ALIASES.has(tenant.toLowerCase()) || isSpecificTenant(tenant);

let isConsumerTenant = (tenant: string) => CONSUMER_TENANTS.has(tenant.toLowerCase());

let canOverrideTenant = (methodTenant: string, override: string) => {
  let normalizedMethodTenant = methodTenant.trim().toLowerCase();
  if (normalizedMethodTenant === 'common') return true;

  return (
    normalizedMethodTenant === 'organizations' &&
    !PERSONAL_ACCOUNT_TENANTS.has(override.toLowerCase())
  );
};

let personalAccountAdminConsentError = () =>
  createApiServiceError(
    'Microsoft admin consent requires a work or school tenant. Personal Microsoft accounts (the consumers tenant) cannot grant admin consent.'
  );

let toAdminConsentTenant = (tenant: string) => {
  let trimmedTenant = tenant.trim();
  let normalizedTenant = trimmedTenant.toLowerCase();

  if (isConsumerTenant(normalizedTenant)) throw personalAccountAdminConsentError();

  // Admin consent rejects the `common` tenant.
  if (normalizedTenant === 'common') return 'organizations';

  if (!isValidTenant(trimmedTenant)) {
    throw createApiServiceError(
      `Microsoft admin consent needs a tenant ID or a verified domain such as contoso.onmicrosoft.com; ${JSON.stringify(trimmedTenant)} is neither.`
    );
  }

  return trimmedTenant;
};

let assertGrantedTenantMatches = (targetTenant: string, grantedTenant: string) => {
  if (!isSpecificTenant(targetTenant)) return;

  // Microsoft returns the tenant ID, which can't be matched to a domain target without a directory lookup.
  if (!isTenantId(targetTenant) && isTenantId(grantedTenant)) return;

  if (targetTenant.toLowerCase() !== grantedTenant.toLowerCase()) {
    throw createApiServiceError(
      'Admin consent was granted in a different Microsoft Entra tenant than the one this integration is configured for. Sign in as an administrator of the configured tenant and grant consent again.'
    );
  }
};

let toRedirectUri = (redirectUri: string, shouldNormalize: boolean) =>
  shouldNormalize ? normalizeMicrosoftRedirectUri(redirectUri) : redirectUri;

let applyScopeMapper = (scopes: string[], scopeMapper?: (scopes: string[]) => string[]) =>
  scopeMapper ? scopeMapper(scopes) : scopes;

// v2 admin consent only accepts fully qualified scopes, so bare ones get the Graph prefix.
let toAdminConsentScopeParam = (scopes: string[]) => {
  let resourceScopes = scopes
    .filter(scope => !OIDC_SCOPES.has(scope.toLowerCase()))
    .map(scope => (scope.includes('/') ? scope : `${MICROSOFT_GRAPH_RESOURCE}/${scope}`));

  return (resourceScopes.length ? resourceScopes : [MICROSOFT_GRAPH_DEFAULT_SCOPE]).join(' ');
};

let renderRequiredPermissions = (requiredPermissions: MicrosoftRequiredPermission[]) =>
  [
    'Admin consent was granted. The Microsoft Entra app registration needs these delegated permissions under **API permissions**:',
    '',
    ...requiredPermissions.map(
      ({ api, permissions }) =>
        `- **${api}**: ${permissions.map(permission => `\`${permission}\``).join(', ')}`
    ),
    '',
    'If any are missing, ask the owner of the app registration to add them, then grant admin consent again.'
  ].join('\n');

let tokenClientCache = new Map<string, ReturnType<typeof createAxios>>();
let getCachedTokenClient = (tenant: string) => {
  let baseURL = microsoftOauthBaseUrl(tenant);
  let cached = tokenClientCache.get(baseURL);
  if (cached) return cached;

  let client = createAxios({ baseURL });
  tokenClientCache.set(baseURL, client);
  return client;
};

// Entra replicates the service principal admin consent creates with a delay, so retry until
// client credentials stop failing with app-not-in-tenant.
let verifyMicrosoftAdminConsent = async (ctx: {
  clientId: string;
  clientSecret: string;
  tenant: string;
}) => {
  // Each consenting tenant is seen once, so this client is not cached.
  let tokenClient = createAxios({ baseURL: microsoftOauthBaseUrl(ctx.tenant) });

  for (let attempt = 0; ; attempt++) {
    try {
      await tokenClient.post(
        '/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'client_credentials',
          scope: MICROSOFT_GRAPH_DEFAULT_SCOPE
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

export let createMicrosoftAdminConsent = (options: MicrosoftAdminConsentOptions) => {
  let { tenant, normalizeRedirectUri: shouldNormalizeRedirectUri = false } = options;
  let scopeMapper = options.mode === 'app-registration' ? undefined : options.scopeMapper;
  let successInstructions = [
    options.requiredPermissions?.length
      ? renderRequiredPermissions(options.requiredPermissions)
      : undefined,
    options.instructions
  ]
    .filter(Boolean)
    .join('\n\n');

  let getAdminTenant = (ctx: MicrosoftTenantContext) =>
    toAdminConsentTenant(typeof tenant === 'function' ? tenant(ctx) : tenant);

  return {
    required: options.required === true,

    getAuthorizationUrl: async (ctx: MicrosoftAdminConsentAuthorizationUrlContext) => {
      let adminTenant = toTenantPathSegment(getAdminTenant(ctx));
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: toRedirectUri(ctx.redirectUri, shouldNormalizeRedirectUri),
        state: ctx.state
      });

      if (options.mode === 'app-registration') {
        return {
          url: `${MICROSOFT_LOGIN_BASE}/${adminTenant}/adminconsent?${params.toString()}`
        };
      }

      params.set('scope', toAdminConsentScopeParam(applyScopeMapper(ctx.scopes, scopeMapper)));
      return {
        url: `${MICROSOFT_LOGIN_BASE}/${adminTenant}/v2.0/adminconsent?${params.toString()}`
      };
    },

    handleCallback: async (
      ctx: MicrosoftAdminConsentCallbackContext
    ): Promise<{ instructions?: string }> => {
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

      let grantedTenant = callbackParams.tenant?.trim() ?? '';
      if (!isSpecificTenant(grantedTenant)) {
        throw createApiServiceError(
          'Admin consent could not be verified: Microsoft returned an invalid tenant.'
        );
      }
      if (isConsumerTenant(grantedTenant)) throw personalAccountAdminConsentError();

      assertGrantedTenantMatches(getAdminTenant(ctx), grantedTenant);

      await verifyMicrosoftAdminConsent({
        clientId: ctx.clientId,
        clientSecret: ctx.clientSecret,
        tenant: grantedTenant
      });

      return successInstructions ? { instructions: successInstructions } : {};
    }
  };
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

  let getTenantOverride = (candidate: unknown) => {
    if (!allowTenantInput) return undefined;

    let override = resolveMicrosoftTenant(candidate, '');
    return override && canOverrideTenant(tenant, override) ? override : undefined;
  };

  // Sign-in and refresh keep the tenant users connected through; only admin consent is
  // targeted at the configured tenant.
  let getTenant = (ctx: { input?: MicrosoftGraphOauthInput }) => {
    let override = getTenantOverride(ctx.input?.tenantId);
    return override && isValidTenant(override) ? override : tenant;
  };
  let getAdminConsentTenant = (ctx: MicrosoftTenantContext) =>
    getTenantOverride(ctx.input?.tenantId) ??
    getTenantOverride(ctx.config?.tenantId) ??
    tenant;

  let getRedirectUri = (redirectUri: string) =>
    toRedirectUri(redirectUri, shouldNormalizeRedirectUri);

  let mapScopes = (rawScopes: string[]) => {
    let mapped = applyScopeMapper(rawScopes, scopeMapper);
    return extraScopes ? [...mapped, ...extraScopes] : mapped;
  };

  let buildScopeParam = (rawScopes: string[]) => mapScopes(rawScopes).join(' ');

  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,
    docs,
    ...(adminConsent
      ? {
          adminSetup: createMicrosoftAdminConsent({
            tenant: getAdminConsentTenant,
            scopeMapper: mapScopes,
            normalizeRedirectUri: shouldNormalizeRedirectUri,
            required: typeof adminConsent === 'object' ? adminConsent.required : undefined
          })
        }
      : {}),

    getAuthorizationUrl: async (ctx: MicrosoftGraphAuthorizationUrlContext) => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: getRedirectUri(ctx.redirectUri),
        scope: buildScopeParam(ctx.scopes),
        state: ctx.state,
        response_mode: 'query'
      });

      return {
        url: `${microsoftOauthBaseUrl(getTenant(ctx))}/authorize?${params.toString()}`
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
