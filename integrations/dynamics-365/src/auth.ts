import { normalizeRetailServerBaseUrl } from '@slates/dynamics-commerce-recipes';
import { normalizeFinOpsBaseUrl } from '@slates/dynamics-finops-recipes';
import { normalizeDataverseInstanceUrl } from '@slates/microsoft-dataverse-recipes';
import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  requestAxiosData,
  SlateAuth
} from 'slates';
import { z } from 'zod';

let MICROSOFT_LOGIN_BASE = 'https://login.microsoftonline.com';
let DEFAULT_TENANT = 'organizations';
let DEFAULT_BUSINESS_CENTRAL_ENVIRONMENT_NAME = 'production';
let BUSINESS_CENTRAL_SCOPE =
  'https://api.businesscentral.dynamics.com/Financials.ReadWrite.All';

let commerceIdSchema = z.union([z.string(), z.number()]);

type MicrosoftTokenResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  token_type?: unknown;
  scope?: unknown;
  id_token?: unknown;
};

type MicrosoftOAuthInput = {
  dataverseInstanceUrl?: string;
  finOpsBaseUrl?: string;
  businessCentralTenantId?: string;
  businessCentralEnvironmentName?: string;
};

type MicrosoftClientCredentialsInput = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  dataverseInstanceUrl?: string;
  finOpsBaseUrl?: string;
  retailServerUrl?: string;
  commerceServerResourceId?: string;
  commerceOperatingUnitNumber?: string;
  commerceLocale?: string;
  commerceChannelId?: string | number;
};

type CommerceAccessTokenInput = {
  token: string;
  retailServerUrl: string;
  commerceOperatingUnitNumber?: string;
  commerceLocale?: string;
  commerceChannelId?: string | number;
};

type DynamicsAuthOutput = {
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  tenantId?: string;
  dataverseToken?: string;
  dataverseRefreshToken?: string;
  dataverseExpiresAt?: string;
  dataverseInstanceUrl?: string;
  finOpsToken?: string;
  finOpsRefreshToken?: string;
  finOpsExpiresAt?: string;
  finOpsBaseUrl?: string;
  businessCentralToken?: string;
  businessCentralRefreshToken?: string;
  businessCentralExpiresAt?: string;
  businessCentralTenantId?: string;
  businessCentralEnvironmentName?: string;
  commerceToken?: string;
  commerceExpiresAt?: string;
  commerceServerResourceId?: string;
  retailServerUrl?: string;
  commerceOperatingUnitNumber?: string;
  commerceLocale?: string;
  commerceChannelId?: string | number;
};

type DynamicsOAuthOutput = DynamicsAuthOutput & {
  token: string;
};

type OAuthRefreshContext = {
  output: DynamicsOAuthOutput;
  input: MicrosoftOAuthInput;
  clientId: string;
  clientSecret: string;
  scopes: string[];
};

type ClientCredentialsRefreshContext = {
  output: DynamicsAuthOutput;
  input: MicrosoftClientCredentialsInput;
  clientId: string;
  clientSecret: string;
  scopes: string[];
};

type AuthResource = 'dataverse' | 'finops' | 'businessCentral' | 'commerce';
type OAuthScopeMode = 'delegated' | 'static';

let serviceError = (message: string, reason = 'dynamics_365_auth_error') =>
  createApiServiceError(message, { reason });

let microsoftAuthError = (error: unknown, operation = 'Microsoft auth request') =>
  buildApiServiceError(error, {
    providerLabel: 'Microsoft identity platform',
    reason: 'microsoft_identity_api_error',
    operation,
    detailKeys: ['error', 'error_description', 'message', 'trace_id', 'correlation_id'],
    nestedKeys: ['error', 'details', 'errors']
  });

let tokenHttp = (tenant: string) =>
  createAxios({
    baseURL: `${MICROSOFT_LOGIN_BASE}/${encodeURIComponent(tenant)}/oauth2/v2.0`
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

let requiredText = (value: string | undefined, field: string) => {
  let trimmed = value?.trim();
  if (!trimmed) throw serviceError(`${field} is required.`);
  return trimmed;
};

let optionalText = (value: string | undefined) => {
  let trimmed = value?.trim();
  return trimmed || undefined;
};

let hasOAuthResourceInput = (input: MicrosoftOAuthInput) =>
  Boolean(
    optionalText(input.dataverseInstanceUrl) ||
      optionalText(input.finOpsBaseUrl) ||
      optionalText(input.businessCentralTenantId) ||
      optionalText(input.businessCentralEnvironmentName)
  );

let withDefaultOAuthInput = (input: MicrosoftOAuthInput): MicrosoftOAuthInput =>
  hasOAuthResourceInput(input)
    ? input
    : {
        ...input,
        businessCentralEnvironmentName: DEFAULT_BUSINESS_CENTRAL_ENVIRONMENT_NAME
      };

let normalizeTenant = (value: string | undefined, field = 'tenantId') => {
  let tenant = optionalText(value) ?? DEFAULT_TENANT;
  if (tenant.includes('/')) {
    throw serviceError(`${field} cannot contain "/".`);
  }

  return tenant;
};

let normalizeBusinessCentralTenant = (value: string | undefined) => {
  let tenant = optionalText(value);
  if (!tenant) return undefined;

  if (tenant.includes('/')) {
    throw serviceError('businessCentralTenantId cannot contain "/".');
  }

  return tenant;
};

let normalizeCommerceServerResourceId = (value: string) =>
  requiredText(value, 'commerceServerResourceId').replace(/\/+$/, '');

let defaultScope = (resource: string) => `${resource.replace(/\/+$/, '')}/.default`;

let unique = (values: string[]) => [...new Set(values.filter(Boolean))];

let identityScopes = (scopes: string[]) =>
  unique([
    'offline_access',
    ...scopes.filter(scope => ['openid', 'profile', 'email'].includes(scope))
  ]);

let oauthResourceBase = (
  resource: AuthResource,
  input: MicrosoftOAuthInput | MicrosoftClientCredentialsInput
) => {
  if (resource === 'dataverse') {
    return normalizeDataverseInstanceUrl(
      requiredText(input.dataverseInstanceUrl, 'dataverseInstanceUrl')
    );
  }

  if (resource === 'finops') {
    return normalizeFinOpsBaseUrl(requiredText(input.finOpsBaseUrl, 'finOpsBaseUrl'));
  }

  if (resource === 'businessCentral') {
    return 'https://api.businesscentral.dynamics.com';
  }

  return normalizeCommerceServerResourceId(
    requiredText(
      (input as MicrosoftClientCredentialsInput).commerceServerResourceId,
      'commerceServerResourceId'
    )
  );
};

let resourceScopes = (
  resource: AuthResource,
  input: MicrosoftOAuthInput,
  mode: OAuthScopeMode
) => {
  if (mode === 'static') {
    return [defaultScope(oauthResourceBase(resource, input))];
  }

  if (resource === 'dataverse')
    return [`${oauthResourceBase(resource, input)}/user_impersonation`];
  if (resource === 'finops')
    return [`${oauthResourceBase(resource, input)}/user_impersonation`];
  return [BUSINESS_CENTRAL_SCOPE];
};

let oauthScopeMode = (resources: AuthResource[]): OAuthScopeMode =>
  resources.length > 1 ? 'static' : 'delegated';

let oauthScopeParam = (
  resource: AuthResource,
  input: MicrosoftOAuthInput,
  scopes: string[],
  mode: OAuthScopeMode
) => unique([...resourceScopes(resource, input, mode), ...identityScopes(scopes)]).join(' ');

let derivedOAuthScopes = (
  resources: AuthResource[],
  input: MicrosoftOAuthInput,
  scopes: string[],
  mode: OAuthScopeMode
) =>
  unique([
    ...resources.flatMap(resource => resourceScopes(resource, input, mode)),
    ...identityScopes(scopes)
  ]);

let derivedClientCredentialsScopes = (
  resources: AuthResource[],
  input: MicrosoftClientCredentialsInput
) => unique(resources.map(resource => defaultScope(oauthResourceBase(resource, input))));

let enabledOAuthResources = (input: MicrosoftOAuthInput): AuthResource[] => {
  let resources: AuthResource[] = [];
  if (optionalText(input.dataverseInstanceUrl)) resources.push('dataverse');
  if (optionalText(input.finOpsBaseUrl)) resources.push('finops');
  if (
    optionalText(input.businessCentralTenantId) ||
    optionalText(input.businessCentralEnvironmentName)
  ) {
    resources.push('businessCentral');
  }
  if (resources.length === 0) {
    throw serviceError(
      'Microsoft OAuth requires at least one resource input: dataverseInstanceUrl, finOpsBaseUrl, businessCentralTenantId, or businessCentralEnvironmentName.'
    );
  }

  return resources;
};

let firstAuthResource = (resources: AuthResource[]) => {
  let [resource] = resources;
  if (!resource) {
    throw serviceError('At least one Dynamics 365 auth resource is required.');
  }

  return resource;
};

let enabledClientCredentialResources = (
  input: MicrosoftClientCredentialsInput
): AuthResource[] => {
  let resources: AuthResource[] = [];
  if (optionalText(input.dataverseInstanceUrl)) resources.push('dataverse');
  if (optionalText(input.finOpsBaseUrl)) resources.push('finops');

  let hasCommerceServerResource = optionalText(input.commerceServerResourceId);
  let hasRetailServer = optionalText(input.retailServerUrl);
  if (hasCommerceServerResource || hasRetailServer) {
    if (!hasCommerceServerResource || !hasRetailServer) {
      throw serviceError(
        'Commerce client credentials require both commerceServerResourceId and retailServerUrl.'
      );
    }
    resources.push('commerce');
  }

  if (resources.length === 0) {
    throw serviceError(
      'microsoft_client_credentials requires at least one resource input: dataverseInstanceUrl, finOpsBaseUrl, or commerceServerResourceId with retailServerUrl.'
    );
  }

  return resources;
};

let normalizeToken = (
  data: MicrosoftTokenResponse,
  options: {
    operation: string;
    previousRefreshToken?: string;
  }
) =>
  normalizeOAuthTokenResponse(data, {
    providerLabel: 'Microsoft',
    operation: options.operation,
    previousRefreshToken: options.previousRefreshToken,
    refreshTokenFallbackMode: 'falsy'
  });

let applyResourceToken = (
  output: DynamicsAuthOutput,
  resource: AuthResource,
  token: ReturnType<typeof normalizeToken>,
  input: MicrosoftOAuthInput | MicrosoftClientCredentialsInput
) => {
  if (resource === 'dataverse') {
    output.dataverseToken = token.token;
    output.dataverseRefreshToken = token.refreshToken;
    output.dataverseExpiresAt = token.expiresAt;
    output.dataverseInstanceUrl = normalizeDataverseInstanceUrl(
      requiredText(input.dataverseInstanceUrl, 'dataverseInstanceUrl')
    );
  }

  if (resource === 'finops') {
    output.finOpsToken = token.token;
    output.finOpsRefreshToken = token.refreshToken;
    output.finOpsExpiresAt = token.expiresAt;
    output.finOpsBaseUrl = normalizeFinOpsBaseUrl(
      requiredText(input.finOpsBaseUrl, 'finOpsBaseUrl')
    );
  }

  if (resource === 'businessCentral') {
    output.businessCentralToken = token.token;
    output.businessCentralRefreshToken = token.refreshToken;
    output.businessCentralExpiresAt = token.expiresAt;
    output.businessCentralTenantId = normalizeBusinessCentralTenant(
      (input as MicrosoftOAuthInput).businessCentralTenantId
    );
    output.businessCentralEnvironmentName = optionalText(
      (input as MicrosoftOAuthInput).businessCentralEnvironmentName
    );
  }

  if (resource === 'commerce') {
    let commerceInput = input as MicrosoftClientCredentialsInput;
    output.commerceToken = token.token;
    output.commerceExpiresAt = token.expiresAt;
    output.commerceServerResourceId = normalizeCommerceServerResourceId(
      requiredText(commerceInput.commerceServerResourceId, 'commerceServerResourceId')
    );
    output.retailServerUrl = normalizeRetailServerBaseUrl(
      requiredText(commerceInput.retailServerUrl, 'retailServerUrl')
    );
    output.commerceOperatingUnitNumber = optionalText(
      commerceInput.commerceOperatingUnitNumber
    );
    output.commerceLocale = optionalText(commerceInput.commerceLocale);
    output.commerceChannelId = commerceInput.commerceChannelId;
  }
};

let applyOAuthCompatibilityToken = (
  output: DynamicsOAuthOutput,
  token: ReturnType<typeof normalizeToken>
) => {
  output.token = token.token;
  output.refreshToken = token.refreshToken;
  output.expiresAt = token.expiresAt;
};

let exchangeRefreshTokenForOAuthResource = async (params: {
  tenant: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  resource: AuthResource;
  input: MicrosoftOAuthInput;
  scopes: string[];
  scopeMode: OAuthScopeMode;
  previousRefreshToken?: string;
}) => {
  let data = await requestToken(
    params.tenant,
    `${params.resource} token exchange`,
    new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      refresh_token: params.refreshToken,
      grant_type: 'refresh_token',
      scope: oauthScopeParam(params.resource, params.input, params.scopes, params.scopeMode)
    })
  );

  return normalizeToken(data, {
    operation: `${params.resource} token exchange`,
    previousRefreshToken: params.previousRefreshToken ?? params.refreshToken
  });
};

let exchangeClientCredentialsForResource = async (
  input: MicrosoftClientCredentialsInput,
  resource: AuthResource,
  operation = `${resource} client credentials token exchange`
) => {
  let tenant = normalizeTenant(input.tenantId);
  let scope = defaultScope(oauthResourceBase(resource, input));

  let data = await requestToken(
    tenant,
    operation,
    new URLSearchParams({
      client_id: requiredText(input.clientId, 'clientId'),
      client_secret: requiredText(input.clientSecret, 'clientSecret'),
      grant_type: 'client_credentials',
      scope
    })
  );

  return normalizeToken(data, { operation });
};

let microsoftOauthInputSchema = z.object({
  dataverseInstanceUrl: z
    .string()
    .optional()
    .describe('Dataverse environment URL to enable Dataverse-backed tools.'),
  finOpsBaseUrl: z
    .string()
    .optional()
    .describe('Finance and Operations environment URL to enable Finance-backed tools.'),
  businessCentralTenantId: z
    .string()
    .optional()
    .describe(
      'Optional Business Central tenant ID or domain segment. Omit to use the Business Central common endpoint.'
    ),
  businessCentralEnvironmentName: z
    .string()
    .optional()
    .describe(
      'Business Central environment name. Defaults to production when no other resource input is provided.'
    )
});

let microsoftClientCredentialsInputSchema = z.object({
  tenantId: z.string().describe('Microsoft Entra tenant ID.'),
  clientId: z.string().describe('Microsoft Entra application client ID.'),
  clientSecret: z.string().describe('Microsoft Entra application client secret.'),
  dataverseInstanceUrl: z
    .string()
    .optional()
    .describe('Dataverse environment URL to enable Dataverse app-only tools.'),
  finOpsBaseUrl: z
    .string()
    .optional()
    .describe('Finance and Operations environment URL to enable app-only FinOps tools.'),
  commerceServerResourceId: z
    .string()
    .optional()
    .describe('Commerce Retail Server application ID URI/resource ID.'),
  retailServerUrl: z.string().optional().describe('Commerce Scale Unit Retail Server URL.'),
  commerceOperatingUnitNumber: z
    .string()
    .optional()
    .describe('Default Commerce operating unit number sent as the OUN header.'),
  commerceLocale: z.string().optional().describe('Default Commerce locale.'),
  commerceChannelId: commerceIdSchema.optional().describe('Default Commerce channel id.')
});

let commerceAccessTokenInputSchema = z.object({
  token: z.string().describe('Existing Commerce Retail Server bearer access token.'),
  retailServerUrl: z.string().describe('Commerce Scale Unit Retail Server URL.'),
  commerceOperatingUnitNumber: z
    .string()
    .optional()
    .describe('Default Commerce operating unit number sent as the OUN header.'),
  commerceLocale: z.string().optional().describe('Default Commerce locale.'),
  commerceChannelId: commerceIdSchema.optional().describe('Default Commerce channel id.')
});

let getProfile = async (output: DynamicsAuthOutput) => ({
  profile: {
    id:
      output.dataverseInstanceUrl ??
      output.finOpsBaseUrl ??
      output.businessCentralTenantId ??
      output.businessCentralEnvironmentName ??
      output.retailServerUrl ??
      output.tenantId ??
      'dynamics-365',
    name: 'Dynamics 365',
    tenantId: output.tenantId,
    dataverseInstanceUrl: output.dataverseInstanceUrl,
    finOpsBaseUrl: output.finOpsBaseUrl,
    businessCentralTenantId: output.businessCentralTenantId,
    retailServerUrl: output.retailServerUrl
  }
});

let createMicrosoftOauth = (name: string, key: string, tenant: string) => ({
  type: 'auth.oauth' as const,
  name,
  key,
  inputSchema: microsoftOauthInputSchema,
  docs: [
    {
      type: 'docs.auth.oauth' as const,
      name: 'Microsoft identity platform OAuth documentation',
      url: 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow'
    }
  ],
  scopes: [],
  getDefaultInput: async () => ({
    businessCentralEnvironmentName: DEFAULT_BUSINESS_CENTRAL_ENVIRONMENT_NAME
  }),

  getAuthorizationUrl: async (ctx: {
    input: MicrosoftOAuthInput;
    clientId: string;
    redirectUri: string;
    scopes: string[];
    state: string;
  }) => {
    let input = withDefaultOAuthInput(ctx.input as MicrosoftOAuthInput);
    let resolvedTenant = normalizeTenant(tenant, 'tenant');
    let resources = enabledOAuthResources(input);
    let primaryResource = firstAuthResource(resources);
    let scopeMode = oauthScopeMode(resources);
    let params = new URLSearchParams({
      client_id: ctx.clientId,
      response_type: 'code',
      redirect_uri: ctx.redirectUri,
      response_mode: 'query',
      scope: oauthScopeParam(primaryResource, input, ctx.scopes, scopeMode),
      state: ctx.state
    });

    return {
      url: `${MICROSOFT_LOGIN_BASE}/${encodeURIComponent(resolvedTenant)}/oauth2/v2.0/authorize?${params.toString()}`,
      input
    };
  },

  handleCallback: async (ctx: {
    input: MicrosoftOAuthInput;
    clientId: string;
    clientSecret: string;
    code: string;
    redirectUri: string;
    scopes: string[];
  }) => {
    let input = withDefaultOAuthInput(ctx.input as MicrosoftOAuthInput);
    let resolvedTenant = normalizeTenant(tenant, 'tenant');
    let resources = enabledOAuthResources(input);
    let primaryResource = firstAuthResource(resources);
    let scopeMode = oauthScopeMode(resources);
    let data = await requestToken(
      resolvedTenant,
      `${primaryResource} authorization code exchange`,
      new URLSearchParams({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        grant_type: 'authorization_code',
        scope: oauthScopeParam(primaryResource, input, ctx.scopes, scopeMode)
      })
    );
    let primaryToken = normalizeToken(data, {
      operation: `${primaryResource} authorization code exchange`
    });
    if (!primaryToken.refreshToken) {
      throw serviceError(
        'Microsoft OAuth did not return a refresh token. Reconnect with offline_access enabled.'
      );
    }

    let output: DynamicsOAuthOutput = {
      tenantId: resolvedTenant,
      token: primaryToken.token
    };
    applyOAuthCompatibilityToken(output, primaryToken);
    applyResourceToken(output, primaryResource, primaryToken, input);

    for (let resource of resources.filter(resource => resource !== primaryResource)) {
      let token = await exchangeRefreshTokenForOAuthResource({
        tenant: resolvedTenant,
        clientId: ctx.clientId,
        clientSecret: ctx.clientSecret,
        refreshToken: primaryToken.refreshToken,
        resource,
        input,
        scopes: ctx.scopes,
        scopeMode,
        previousRefreshToken: primaryToken.refreshToken
      });
      applyResourceToken(output, resource, token, input);
    }

    return {
      output,
      input,
      scopes: derivedOAuthScopes(resources, input, ctx.scopes, scopeMode)
    };
  },

  handleTokenRefresh: async (ctx: OAuthRefreshContext) => {
    let input = ctx.input as MicrosoftOAuthInput;
    let resolvedTenant = normalizeTenant(tenant, 'tenant');
    let refreshInput = withDefaultOAuthInput({
      dataverseInstanceUrl: input.dataverseInstanceUrl ?? ctx.output.dataverseInstanceUrl,
      finOpsBaseUrl: input.finOpsBaseUrl ?? ctx.output.finOpsBaseUrl,
      businessCentralTenantId:
        input.businessCentralTenantId ?? ctx.output.businessCentralTenantId,
      businessCentralEnvironmentName:
        input.businessCentralEnvironmentName ?? ctx.output.businessCentralEnvironmentName
    });
    let resources = enabledOAuthResources(refreshInput);
    let primaryResource = firstAuthResource(resources);
    let scopeMode = oauthScopeMode(resources);
    let output: DynamicsOAuthOutput = {
      ...ctx.output,
      tenantId: resolvedTenant,
      token: ctx.output.token
    };

    for (let resource of resources) {
      let refreshToken =
        resource === 'dataverse'
          ? ctx.output.dataverseRefreshToken
          : resource === 'finops'
            ? ctx.output.finOpsRefreshToken
            : ctx.output.businessCentralRefreshToken;
      if (!refreshToken) {
        throw serviceError(`Cannot refresh ${resource} token without a refresh token.`);
      }

      let token = await exchangeRefreshTokenForOAuthResource({
        tenant: resolvedTenant,
        clientId: ctx.clientId,
        clientSecret: ctx.clientSecret,
        refreshToken,
        resource,
        input: {
          dataverseInstanceUrl: refreshInput.dataverseInstanceUrl,
          finOpsBaseUrl: refreshInput.finOpsBaseUrl,
          businessCentralTenantId: refreshInput.businessCentralTenantId,
          businessCentralEnvironmentName: refreshInput.businessCentralEnvironmentName
        },
        scopes: ctx.scopes,
        scopeMode,
        previousRefreshToken: refreshToken
      });
      if (resource === primaryResource) {
        applyOAuthCompatibilityToken(output, token);
      }
      applyResourceToken(output, resource, token, {
        dataverseInstanceUrl: refreshInput.dataverseInstanceUrl,
        finOpsBaseUrl: refreshInput.finOpsBaseUrl,
        businessCentralTenantId: refreshInput.businessCentralTenantId,
        businessCentralEnvironmentName: refreshInput.businessCentralEnvironmentName
      });
    }

    return { output, input: refreshInput };
  },

  getProfile: async (ctx: { output: DynamicsAuthOutput }) => getProfile(ctx.output)
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .optional()
        .describe(
          'Compatibility OAuth access token mirror for the primary Dynamics resource.'
        ),
      refreshToken: z
        .string()
        .optional()
        .describe(
          'Compatibility OAuth refresh token mirror for the primary Dynamics resource.'
        ),
      expiresAt: z
        .string()
        .optional()
        .describe('Compatibility OAuth expiration mirror for the primary Dynamics resource.'),
      tenantId: z.string().optional(),
      dataverseToken: z.string().optional(),
      dataverseRefreshToken: z.string().optional(),
      dataverseExpiresAt: z.string().optional(),
      dataverseInstanceUrl: z.string().optional(),
      finOpsToken: z.string().optional(),
      finOpsRefreshToken: z.string().optional(),
      finOpsExpiresAt: z.string().optional(),
      finOpsBaseUrl: z.string().optional(),
      businessCentralToken: z.string().optional(),
      businessCentralRefreshToken: z.string().optional(),
      businessCentralExpiresAt: z.string().optional(),
      businessCentralTenantId: z.string().optional(),
      businessCentralEnvironmentName: z.string().optional(),
      commerceToken: z.string().optional(),
      commerceExpiresAt: z.string().optional(),
      commerceServerResourceId: z.string().optional(),
      retailServerUrl: z.string().optional(),
      commerceOperatingUnitNumber: z.string().optional(),
      commerceLocale: z.string().optional(),
      commerceChannelId: commerceIdSchema.optional()
    })
  )
  .addOauth(createMicrosoftOauth('Work & Personal', 'oauth_common', 'common'))
  .addOauth(createMicrosoftOauth('Work Only', 'oauth_organizations', 'organizations'))
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Microsoft Client Credentials',
    key: 'microsoft_client_credentials',
    inputSchema: microsoftClientCredentialsInputSchema,
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Microsoft identity platform client credentials flow',
        url: 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow'
      }
    ],

    getOutput: async ctx => {
      let input = ctx.input as MicrosoftClientCredentialsInput;
      let output: DynamicsAuthOutput = {
        tenantId: normalizeTenant(input.tenantId)
      };
      let resources = enabledClientCredentialResources(input);

      for (let resource of resources) {
        let token = await exchangeClientCredentialsForResource(input, resource);
        applyResourceToken(output, resource, token, input);
      }

      return {
        output,
        scopes: derivedClientCredentialsScopes(resources, input)
      };
    },

    handleTokenRefresh: async (ctx: ClientCredentialsRefreshContext) => {
      let input = ctx.input as MicrosoftClientCredentialsInput;
      let output: DynamicsAuthOutput = {
        ...ctx.output,
        tenantId: normalizeTenant(input.tenantId)
      };

      for (let resource of enabledClientCredentialResources(input)) {
        let token = await exchangeClientCredentialsForResource(
          input,
          resource,
          `${resource} client credentials token refresh`
        );
        applyResourceToken(output, resource, token, input);
      }

      return { output };
    },

    getProfile: async (ctx: { output: DynamicsAuthOutput }) => getProfile(ctx.output)
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Commerce Access Token',
    key: 'commerce_access_token',
    inputSchema: commerceAccessTokenInputSchema,
    getOutput: async ctx => {
      let input = ctx.input as CommerceAccessTokenInput;
      let output: DynamicsAuthOutput = {
        commerceToken: requiredText(input.token, 'token'),
        retailServerUrl: normalizeRetailServerBaseUrl(
          requiredText(input.retailServerUrl, 'retailServerUrl')
        ),
        commerceOperatingUnitNumber: optionalText(input.commerceOperatingUnitNumber),
        commerceLocale: optionalText(input.commerceLocale),
        commerceChannelId: input.commerceChannelId
      };

      return { output };
    },
    getProfile: async (ctx: { output: DynamicsAuthOutput }) => getProfile(ctx.output)
  });
