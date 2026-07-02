import { createLocalSlateTestClient } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

let tokenPost = vi.fn();

let loadProviderClient = async () => {
  vi.resetModules();
  tokenPost.mockReset();

  vi.doMock('slates', async () => {
    let actual = await vi.importActual<typeof import('slates')>('slates');

    return {
      ...actual,
      createAxios: vi.fn((config?: { baseURL?: string }) => {
        if (config?.baseURL?.startsWith('https://login.microsoftonline.com')) {
          return {
            post: tokenPost
          };
        }

        return actual.createAxios(config);
      })
    };
  });

  let { provider } = await import('./index');
  return createLocalSlateTestClient({ slate: provider });
};

let microsoftOAuthParams = {
  authenticationMethodId: 'oauth_organizations',
  redirectUri: 'https://example.com/callback',
  state: 'state-123',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  scopes: ['offline_access']
};

let multiResourceInput = {
  dataverseInstanceUrl: 'https://contoso.crm.dynamics.com',
  finOpsBaseUrl: 'https://contoso.operations.dynamics.com',
  businessCentralTenantId: 'business-tenant',
  businessCentralEnvironmentName: 'sandbox'
};

let businessCentralScope = 'https://api.businesscentral.dynamics.com/Financials.ReadWrite.All';

let tokenBody = (callIndex: number) =>
  new URLSearchParams(String(tokenPost.mock.calls[callIndex]?.[1]));

afterEach(() => {
  vi.doUnmock('slates');
  vi.resetModules();
});

describe('dynamics 365 auth contract', () => {
  it('does not expose static OAuth resource scopes as checkbox metadata', async () => {
    let client = await loadProviderClient();
    let result = await client.listAuthMethods();

    expect(
      result.authenticationMethods.find(method => method.id === 'oauth_common')?.scopes
    ).toEqual([]);
    expect(
      result.authenticationMethods.find(method => method.id === 'oauth_organizations')?.scopes
    ).toEqual([]);
  });

  it('uses the common authority for Work & Personal OAuth authorization URLs', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      ...microsoftOAuthParams,
      authenticationMethodId: 'oauth_common',
      input: {
        dataverseInstanceUrl: 'https://contoso.crm.dynamics.com'
      }
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
    );
  });

  it('uses delegated scopes for single-resource OAuth authorization URLs', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      ...microsoftOAuthParams,
      input: {
        dataverseInstanceUrl: 'https://contoso.crm.dynamics.com'
      }
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize'
    );
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.com/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('scope')).toBe(
      'https://contoso.crm.dynamics.com/user_impersonation offline_access'
    );
  });

  it('enables Business Central OAuth with an environment name and no tenant segment', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      ...microsoftOAuthParams,
      input: {
        businessCentralEnvironmentName: 'production'
      }
    });

    let url = new URL(result.authorizationUrl);
    expect(url.searchParams.get('scope')).toBe(`${businessCentralScope} offline_access`);

    tokenPost.mockResolvedValueOnce({
      data: {
        access_token: 'business-central-token',
        refresh_token: 'business-central-refresh-token',
        expires_in: 3600
      }
    });

    let callbackResult = await client.handleAuthorizationCallback({
      ...microsoftOAuthParams,
      code: 'auth-code',
      input: {
        businessCentralEnvironmentName: 'production'
      }
    });

    expect(tokenPost).toHaveBeenCalledTimes(1);
    expect(tokenBody(0).get('scope')).toBe(
      'https://api.businesscentral.dynamics.com/Financials.ReadWrite.All offline_access'
    );
    expect(callbackResult.output).toMatchObject({
      token: 'business-central-token',
      refreshToken: 'business-central-refresh-token',
      businessCentralToken: 'business-central-token',
      businessCentralRefreshToken: 'business-central-refresh-token',
      businessCentralEnvironmentName: 'production'
    });
    expect(callbackResult.scopes).toEqual([businessCentralScope, 'offline_access']);
    expect(callbackResult.output.businessCentralTenantId).toBeUndefined();
  });

  it('preserves optional identity scopes without storing stale resource aliases', async () => {
    let client = await loadProviderClient();
    let selectedScopes = [
      'dataverse_user_impersonation',
      'finops_user_impersonation',
      businessCentralScope,
      'offline_access',
      'openid',
      'profile',
      'email'
    ];
    let result = await client.getAuthorizationUrl({
      ...microsoftOAuthParams,
      scopes: selectedScopes,
      input: {
        businessCentralEnvironmentName: 'production'
      }
    });

    let url = new URL(result.authorizationUrl);
    expect(url.searchParams.get('scope')).toBe(
      `${businessCentralScope} offline_access openid profile email`
    );

    tokenPost.mockResolvedValueOnce({
      data: {
        access_token: 'business-central-token',
        refresh_token: 'business-central-refresh-token',
        expires_in: 3600
      }
    });

    let callbackResult = await client.handleAuthorizationCallback({
      ...microsoftOAuthParams,
      scopes: selectedScopes,
      code: 'auth-code',
      input: {
        businessCentralEnvironmentName: 'production'
      }
    });

    expect(callbackResult.scopes).toEqual([
      businessCentralScope,
      'offline_access',
      'openid',
      'profile',
      'email'
    ]);
    expect(callbackResult.scopes).not.toContain('dataverse_user_impersonation');
    expect(callbackResult.scopes).not.toContain('finops_user_impersonation');
  });

  it('defaults empty OAuth input to Business Central production', async () => {
    let client = await loadProviderClient();
    await expect(client.getDefaultAuthInput('oauth_organizations')).resolves.toEqual({
      input: {
        businessCentralEnvironmentName: 'production'
      }
    });

    let result = await client.getAuthorizationUrl({
      ...microsoftOAuthParams,
      input: {}
    });

    let url = new URL(result.authorizationUrl);
    expect(url.searchParams.get('scope')).toBe(`${businessCentralScope} offline_access`);
    expect(result.input).toEqual({
      businessCentralEnvironmentName: 'production'
    });

    tokenPost.mockResolvedValueOnce({
      data: {
        access_token: 'business-central-token',
        refresh_token: 'business-central-refresh-token',
        expires_in: 3600
      }
    });

    let callbackResult = await client.handleAuthorizationCallback({
      ...microsoftOAuthParams,
      code: 'auth-code',
      input: {}
    });

    expect(callbackResult.input).toEqual({
      businessCentralEnvironmentName: 'production'
    });
    expect(callbackResult.output).toMatchObject({
      businessCentralToken: 'business-central-token',
      businessCentralRefreshToken: 'business-central-refresh-token',
      businessCentralEnvironmentName: 'production'
    });
    expect(callbackResult.scopes).toEqual([businessCentralScope, 'offline_access']);
  });

  it('uses static resource scopes for multi-resource OAuth authorization URLs', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      ...microsoftOAuthParams,
      input: multiResourceInput
    });

    let url = new URL(result.authorizationUrl);
    expect(url.searchParams.get('scope')).toBe(
      'https://contoso.crm.dynamics.com/.default offline_access'
    );
  });

  it('exchanges multi-resource OAuth callbacks with per-resource static scopes', async () => {
    let client = await loadProviderClient();
    tokenPost
      .mockResolvedValueOnce({
        data: {
          access_token: 'dataverse-token',
          refresh_token: 'dataverse-refresh-token',
          expires_in: 3600
        }
      })
      .mockResolvedValueOnce({
        data: {
          access_token: 'finops-token',
          refresh_token: 'finops-refresh-token',
          expires_in: 3600
        }
      })
      .mockResolvedValueOnce({
        data: {
          access_token: 'business-central-token',
          refresh_token: 'business-central-refresh-token',
          expires_in: 3600
        }
      });

    let callbackResult = await client.handleAuthorizationCallback({
      ...microsoftOAuthParams,
      code: 'auth-code',
      input: multiResourceInput
    });

    expect(tokenPost).toHaveBeenCalledTimes(3);
    expect(tokenBody(0).get('grant_type')).toBe('authorization_code');
    expect(tokenBody(0).get('scope')).toBe(
      'https://contoso.crm.dynamics.com/.default offline_access'
    );
    expect(tokenBody(1).get('grant_type')).toBe('refresh_token');
    expect(tokenBody(1).get('scope')).toBe(
      'https://contoso.operations.dynamics.com/.default offline_access'
    );
    expect(tokenBody(2).get('grant_type')).toBe('refresh_token');
    expect(tokenBody(2).get('scope')).toBe(
      'https://api.businesscentral.dynamics.com/.default offline_access'
    );
    expect(callbackResult.output).toMatchObject({
      token: 'dataverse-token',
      refreshToken: 'dataverse-refresh-token',
      dataverseToken: 'dataverse-token',
      dataverseRefreshToken: 'dataverse-refresh-token',
      dataverseInstanceUrl: 'https://contoso.crm.dynamics.com',
      finOpsToken: 'finops-token',
      finOpsRefreshToken: 'finops-refresh-token',
      finOpsBaseUrl: 'https://contoso.operations.dynamics.com',
      businessCentralToken: 'business-central-token',
      businessCentralRefreshToken: 'business-central-refresh-token',
      businessCentralTenantId: 'business-tenant',
      businessCentralEnvironmentName: 'sandbox'
    });
    expect(callbackResult.scopes).toEqual([
      'https://contoso.crm.dynamics.com/.default',
      'https://contoso.operations.dynamics.com/.default',
      'https://api.businesscentral.dynamics.com/.default',
      'offline_access'
    ]);
  });

  it('returns derived client credential scopes for enabled app-only resources', async () => {
    let client = await loadProviderClient();
    tokenPost
      .mockResolvedValueOnce({
        data: {
          access_token: 'dataverse-token',
          expires_in: 3600
        }
      })
      .mockResolvedValueOnce({
        data: {
          access_token: 'finops-token',
          expires_in: 3600
        }
      })
      .mockResolvedValueOnce({
        data: {
          access_token: 'commerce-token',
          expires_in: 3600
        }
      });

    let result = await client.getAuthOutput({
      authenticationMethodId: 'microsoft_client_credentials',
      input: {
        tenantId: 'tenant-id',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        dataverseInstanceUrl: 'https://contoso.crm.dynamics.com',
        finOpsBaseUrl: 'https://contoso.operations.dynamics.com',
        commerceServerResourceId: 'api://commerce',
        retailServerUrl: 'https://retail.contoso.com'
      }
    });

    expect(tokenPost).toHaveBeenCalledTimes(3);
    expect(result.scopes).toEqual([
      'https://contoso.crm.dynamics.com/.default',
      'https://contoso.operations.dynamics.com/.default',
      'api://commerce/.default'
    ]);
  });

  it('refreshes multi-resource OAuth tokens with per-resource static scopes', async () => {
    let client = await loadProviderClient();
    tokenPost
      .mockResolvedValueOnce({
        data: {
          access_token: 'refreshed-dataverse-token',
          expires_in: 3600
        }
      })
      .mockResolvedValueOnce({
        data: {
          access_token: 'refreshed-finops-token',
          expires_in: 3600
        }
      })
      .mockResolvedValueOnce({
        data: {
          access_token: 'refreshed-business-central-token',
          expires_in: 3600
        }
      });

    let refreshResult = await client.refreshToken({
      ...microsoftOAuthParams,
      input: {},
      output: {
        token: 'stale-dataverse-token',
        refreshToken: 'dataverse-refresh-token',
        tenantId: 'organizations',
        dataverseToken: 'stale-dataverse-token',
        dataverseRefreshToken: 'dataverse-refresh-token',
        dataverseInstanceUrl: 'https://contoso.crm.dynamics.com',
        finOpsToken: 'stale-finops-token',
        finOpsRefreshToken: 'finops-refresh-token',
        finOpsBaseUrl: 'https://contoso.operations.dynamics.com',
        businessCentralToken: 'stale-business-central-token',
        businessCentralRefreshToken: 'business-central-refresh-token',
        businessCentralTenantId: 'business-tenant',
        businessCentralEnvironmentName: 'sandbox'
      }
    });

    expect(tokenPost).toHaveBeenCalledTimes(3);
    expect(tokenBody(0).get('scope')).toBe(
      'https://contoso.crm.dynamics.com/.default offline_access'
    );
    expect(tokenBody(1).get('scope')).toBe(
      'https://contoso.operations.dynamics.com/.default offline_access'
    );
    expect(tokenBody(2).get('scope')).toBe(
      'https://api.businesscentral.dynamics.com/.default offline_access'
    );
    expect(refreshResult.output).toMatchObject({
      token: 'refreshed-dataverse-token',
      refreshToken: 'dataverse-refresh-token',
      dataverseToken: 'refreshed-dataverse-token',
      dataverseRefreshToken: 'dataverse-refresh-token',
      finOpsToken: 'refreshed-finops-token',
      finOpsRefreshToken: 'finops-refresh-token',
      businessCentralToken: 'refreshed-business-central-token',
      businessCentralRefreshToken: 'business-central-refresh-token',
      businessCentralEnvironmentName: 'sandbox'
    });
  });
});
