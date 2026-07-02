import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { DEFAULT_FABRIC_TENANT_ID } from './config';
import { fabricOAuthError, fabricServiceError } from './lib/errors';

export type FabricAuthOutput = {
  token: string;
  fabricToken: string;
  storageToken: string;
  refreshToken: string;
  fabricExpiresAt?: string;
  storageExpiresAt?: string;
  tenantId: string;
  grantedScopes: string[];
};

type FabricOAuthRefreshContext = {
  output: FabricAuthOutput;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  config?: Record<string, unknown>;
};

type FabricOAuthProfileContext = {
  output: FabricAuthOutput;
  scopes: string[];
  config?: Record<string, unknown>;
};

let fabricScopes = [
  {
    title: 'Workspace Read/Write',
    description: 'Read and write Microsoft Fabric workspaces.',
    scope: 'https://api.fabric.microsoft.com/Workspace.ReadWrite.All'
  },
  {
    title: 'Item Read/Write',
    description: 'Read and write Microsoft Fabric items.',
    scope: 'https://api.fabric.microsoft.com/Item.ReadWrite.All'
  },
  {
    title: 'Item Execute',
    description: 'Execute Microsoft Fabric item jobs and queries.',
    scope: 'https://api.fabric.microsoft.com/Item.Execute.All'
  },
  {
    title: 'Offline Access',
    description: 'Maintain access with refresh tokens.',
    scope: 'offline_access'
  }
];

let storageScope = 'https://storage.azure.com/.default';

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

let tokenExpiresAt = (expiresIn?: number) =>
  typeof expiresIn === 'number'
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : undefined;

let normalizeTenantId = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

let resolveTenantId = (
  config?: Record<string, unknown>,
  output?: Pick<FabricAuthOutput, 'tenantId'>
) => {
  let configuredTenantId = normalizeTenantId(config?.tenantId);
  if (configuredTenantId) return configuredTenantId;

  let outputTenantId = normalizeTenantId(output?.tenantId);
  return outputTenantId ?? DEFAULT_FABRIC_TENANT_ID;
};

let tokenUrl = (tenantId: string) =>
  `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;

let requireAccessToken = (data: TokenResponse, audience: 'Fabric' | 'Storage') => {
  if (!data.access_token) {
    throw fabricServiceError(`${audience} token response did not include an access token.`);
  }
  return data.access_token;
};

let redeemAuthorizationCode = async (input: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  scopes: string[];
}) => {
  let http = createAxios();

  try {
    let response = await http.post(
      tokenUrl(input.tenantId),
      new URLSearchParams({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        code: input.code,
        redirect_uri: input.redirectUri,
        grant_type: 'authorization_code',
        scope: input.scopes.join(' ')
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    return response.data as TokenResponse;
  } catch (error) {
    throw fabricOAuthError(error, 'OAuth authorization-code exchange');
  }
};

let redeemRefreshToken = async (input: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  scope: string;
  audience: 'Fabric' | 'Storage';
}) => {
  let http = createAxios();

  try {
    let response = await http.post(
      tokenUrl(input.tenantId),
      new URLSearchParams({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        refresh_token: input.refreshToken,
        grant_type: 'refresh_token',
        scope: input.scope
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    return response.data as TokenResponse;
  } catch (error) {
    let serviceError = fabricOAuthError(error, `${input.audience} refresh-token exchange`);
    if (input.audience === 'Storage') {
      serviceError.data.reason = 'microsoft_fabric_storage_consent_missing';
      serviceError.data.requiredScope = storageScope;
      serviceError.data.message =
        'OneLake tools require delegated Azure Storage consent for https://storage.azure.com/.default.';
    }
    throw serviceError;
  }
};

let buildOutput = (input: {
  tenantId: string;
  scopes: string[];
  fabric: TokenResponse;
  storage: TokenResponse;
  fallbackRefreshToken?: string;
}): FabricAuthOutput => {
  let refreshToken =
    input.fabric.refresh_token ?? input.storage.refresh_token ?? input.fallbackRefreshToken;
  if (!refreshToken) {
    throw fabricServiceError(
      'Microsoft Entra did not return a refresh token. Re-authenticate with offline_access enabled.'
    );
  }

  let fabricToken = requireAccessToken(input.fabric, 'Fabric');
  let storageToken = requireAccessToken(input.storage, 'Storage');

  return {
    token: fabricToken,
    fabricToken,
    storageToken,
    refreshToken,
    fabricExpiresAt: tokenExpiresAt(input.fabric.expires_in),
    storageExpiresAt: tokenExpiresAt(input.storage.expires_in),
    tenantId: input.tenantId,
    grantedScopes: [
      ...(input.fabric.scope ? input.fabric.scope.split(/\s+/).filter(Boolean) : input.scopes),
      ...(input.storage.scope
        ? input.storage.scope.split(/\s+/).filter(Boolean)
        : [storageScope])
    ]
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Fabric API access token.'),
      fabricToken: z.string().describe('Microsoft Fabric API access token.'),
      storageToken: z.string().describe('Azure Storage audience token used by OneLake.'),
      refreshToken: z.string().describe('Microsoft Entra refresh token.'),
      fabricExpiresAt: z.string().optional().describe('Fabric token expiration time.'),
      storageExpiresAt: z.string().optional().describe('Storage token expiration time.'),
      tenantId: z.string().describe('Microsoft Entra tenant used for token exchange.'),
      grantedScopes: z
        .array(z.string())
        .describe('Granted delegated scopes and token audiences.')
    })
  )
  .addOauth<Record<string, never>>({
    type: 'auth.oauth',
    name: 'Work Only',
    key: 'oauth_organizations',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'Microsoft identity platform OAuth flow',
        url: 'https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'Microsoft Fabric REST scopes',
        url: 'https://learn.microsoft.com/en-us/rest/api/fabric/articles/scopes'
      }
    ],
    scopes: fabricScopes,
    getAuthorizationUrl: async ctx => {
      let tenantId = resolveTenantId(ctx.config);
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        response_mode: 'query',
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://login.microsoftonline.com/${encodeURIComponent(
          tenantId
        )}/oauth2/v2.0/authorize?${params.toString()}`
      };
    },
    handleCallback: async ctx => {
      let tenantId = resolveTenantId(ctx.config);
      let fabric = await redeemAuthorizationCode({
        tenantId,
        clientId: ctx.clientId,
        clientSecret: ctx.clientSecret,
        code: ctx.code,
        redirectUri: ctx.redirectUri,
        scopes: ctx.scopes
      });

      if (!fabric.refresh_token) {
        throw fabricServiceError(
          'Microsoft Entra did not return a refresh token. Re-authenticate with offline_access enabled.'
        );
      }

      let storage = await redeemRefreshToken({
        tenantId,
        clientId: ctx.clientId,
        clientSecret: ctx.clientSecret,
        refreshToken: fabric.refresh_token,
        scope: storageScope,
        audience: 'Storage'
      });

      return {
        output: buildOutput({ tenantId, scopes: ctx.scopes, fabric, storage })
      };
    },
    handleTokenRefresh: async (ctx: FabricOAuthRefreshContext) => {
      if (!ctx.output.refreshToken) {
        throw fabricServiceError(
          'No refresh token available. Re-authenticate Microsoft Fabric.'
        );
      }

      let tenantId = resolveTenantId(ctx.config, ctx.output);
      let fabric = await redeemRefreshToken({
        tenantId,
        clientId: ctx.clientId,
        clientSecret: ctx.clientSecret,
        refreshToken: ctx.output.refreshToken,
        scope: ctx.scopes.join(' '),
        audience: 'Fabric'
      });
      let storage = await redeemRefreshToken({
        tenantId,
        clientId: ctx.clientId,
        clientSecret: ctx.clientSecret,
        refreshToken: fabric.refresh_token ?? ctx.output.refreshToken,
        scope: storageScope,
        audience: 'Storage'
      });

      return {
        output: buildOutput({
          tenantId,
          scopes: ctx.scopes,
          fabric,
          storage,
          fallbackRefreshToken: ctx.output.refreshToken
        })
      };
    },
    getProfile: async (ctx: FabricOAuthProfileContext) => ({
      profile: {
        name: 'Microsoft Fabric',
        tenantId: resolveTenantId(ctx.config, ctx.output),
        scopes: ctx.output.grantedScopes
      }
    })
  });
