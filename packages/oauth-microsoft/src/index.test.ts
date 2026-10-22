import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildMicrosoftGraphUploadBody,
  createMicrosoftGraphOauth,
  mapAzureDevOpsScopes,
  normalizeMicrosoftRedirectUri,
  normalizeMicrosoftRedirectUriForIntegration,
  resolveMicrosoftTenant,
  usesMicrosoftOAuth
} from './index';

let { tokenPost } = vi.hoisted(() => ({ tokenPost: vi.fn() }));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  return {
    ...actual,
    createAxios: (config?: { baseURL?: string }) => ({
      post: (...args: unknown[]) => tokenPost(config?.baseURL, ...args),
      get: vi.fn()
    })
  };
});

describe('@slates/oauth-microsoft', () => {
  it('normalizes loopback IPv4 redirect URIs to localhost', () => {
    expect(normalizeMicrosoftRedirectUri('http://127.0.0.1:45873/callback')).toBe(
      'http://localhost:45873/callback'
    );
  });

  it('leaves non-loopback redirect URIs unchanged', () => {
    expect(normalizeMicrosoftRedirectUri('https://example.com/callback')).toBe(
      'https://example.com/callback'
    );
  });

  it('detects Microsoft OAuth integrations', () => {
    expect(usesMicrosoftOAuth('microsoft-fabric')).toBe(true);
    expect(usesMicrosoftOAuth('sharepoint')).toBe(true);
    expect(usesMicrosoftOAuth('github')).toBe(false);
  });

  it('only normalizes redirect URIs for Microsoft OAuth integrations', () => {
    expect(
      normalizeMicrosoftRedirectUriForIntegration('outlook', 'http://127.0.0.1:45873/callback')
    ).toBe('http://localhost:45873/callback');
    expect(
      normalizeMicrosoftRedirectUriForIntegration(
        'microsoft-fabric',
        'http://127.0.0.1:45873/callback'
      )
    ).toBe('http://localhost:45873/callback');
    expect(
      normalizeMicrosoftRedirectUriForIntegration('github', 'http://127.0.0.1:45873/callback')
    ).toBe('http://127.0.0.1:45873/callback');
  });

  it('can normalize redirect URIs in the OAuth factory', async () => {
    let oauth = createMicrosoftGraphOauth({
      name: 'SharePoint',
      key: 'oauth',
      tenant: 'common',
      scopes: [],
      normalizeRedirectUri: true
    });

    let { url } = await oauth.getAuthorizationUrl({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'http://127.0.0.1:45873/callback',
      scopes: [],
      state: 'state'
    });

    expect(new URL(url).searchParams.get('redirect_uri')).toBe(
      'http://localhost:45873/callback'
    );
  });

  it('uses the default tenant when the input tenant is missing or blank', () => {
    expect(resolveMicrosoftTenant(undefined, 'common')).toBe('common');
    expect(resolveMicrosoftTenant('   ', 'organizations')).toBe('organizations');
  });

  it('uses a trimmed tenant override when provided', () => {
    expect(resolveMicrosoftTenant(' tenants/foo ', 'common')).toBe('tenants/foo');
  });

  it('builds Azure DevOps resource-qualified scopes with offline access', async () => {
    let oauth = createMicrosoftGraphOauth({
      name: 'Azure DevOps',
      key: 'oauth',
      tenant: 'organizations',
      scopes: [
        {
          title: 'Profile',
          description: 'Read Azure DevOps profile information',
          scope: 'vso.profile'
        }
      ],
      scopeMapper: mapAzureDevOpsScopes,
      extraScopes: ['offline_access']
    });

    let { url } = await oauth.getAuthorizationUrl({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'http://localhost/callback',
      scopes: ['vso.profile'],
      state: 'state'
    });

    let parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize'
    );
    expect(parsed.searchParams.get('scope')).toBe(
      '499b84ac-1321-427f-aa17-267ca6975798/vso.profile offline_access'
    );
  });

  it('can preserve OAuth output when a refresh token is missing', async () => {
    let oauth = createMicrosoftGraphOauth({
      name: 'Azure DevOps',
      key: 'oauth',
      tenant: 'organizations',
      scopes: [],
      onMissingRefreshToken: 'preserve'
    });
    let output = { token: 'existing-token' };

    await expect(
      oauth.handleTokenRefresh({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        scopes: [],
        output
      })
    ).resolves.toEqual({ output });
  });

  it('decodes binary-looking base64 uploads for non-text files', () => {
    let body = buildMicrosoftGraphUploadBody(
      'report.docx',
      'SGVsbG8=',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    expect(Buffer.isBuffer(body)).toBe(true);
    expect(body.toString('utf8')).toBe('Hello');
  });

  it('preserves text uploads even when the content looks like base64', () => {
    let body = buildMicrosoftGraphUploadBody('notes.txt', 'SGVsbG8=', 'text/plain');

    expect(body).toBe('SGVsbG8=');
  });
});

describe('createMicrosoftGraphOauth admin consent', () => {
  let createOauth = (options: { tenant: string; allowTenantInput?: boolean }) =>
    createMicrosoftGraphOauth({
      name: 'Teams',
      key: 'oauth',
      scopes: [],
      normalizeRedirectUri: true,
      adminConsent: true,
      ...options
    });

  let urlContext = {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'http://127.0.0.1:45873/callback',
    scopes: ['User.Read'],
    state: 'state-123'
  };

  let callbackCredentials = { clientId: 'client-id', clientSecret: 'client-secret' };
  let tenantId = '72f988bf-86f1-41af-91ab-2d7cd011db47';

  let appNotInTenantError = {
    response: {
      status: 400,
      data: {
        error: 'unauthorized_client',
        error_description: `AADSTS700016: Application with identifier 'client-id' was not found in the directory.`,
        error_codes: [700016]
      }
    }
  };

  afterEach(() => {
    tokenPost.mockReset();
    vi.useRealTimers();
  });

  it('omits admin setup unless enabled', () => {
    expect(
      createMicrosoftGraphOauth({ name: 'Teams', key: 'oauth', tenant: 'common', scopes: [] })
    ).not.toHaveProperty('adminSetup');
  });

  it('builds the v2 admin consent URL with Graph-qualified scopes, swapping common for organizations', async () => {
    let { url } = await createOauth({ tenant: 'common' }).adminSetup!.getAuthorizationUrl({
      ...urlContext,
      scopes: ['User.Read', 'openid', 'offline_access', 'ChannelMessage.Read.All']
    });

    let parsed = new URL(url);
    expect(`${parsed.origin}${parsed.pathname}`).toBe(
      'https://login.microsoftonline.com/organizations/v2.0/adminconsent'
    );
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      client_id: 'client-id',
      redirect_uri: 'http://localhost:45873/callback',
      state: 'state-123',
      scope:
        'https://graph.microsoft.com/User.Read https://graph.microsoft.com/ChannelMessage.Read.All'
    });
  });

  it('keeps resource-qualified scopes and falls back to .default when only OIDC scopes remain', async () => {
    let azureDevOps = createMicrosoftGraphOauth({
      name: 'Azure DevOps',
      key: 'oauth',
      tenant: 'organizations',
      scopes: [],
      scopeMapper: mapAzureDevOpsScopes,
      extraScopes: ['offline_access'],
      adminConsent: true
    });
    let { url } = await azureDevOps.adminSetup!.getAuthorizationUrl({
      ...urlContext,
      scopes: ['vso.profile']
    });
    expect(new URL(url).searchParams.get('scope')).toBe(
      '499b84ac-1321-427f-aa17-267ca6975798/vso.profile'
    );

    let oidcOnly = await createOauth({
      tenant: 'organizations'
    }).adminSetup!.getAuthorizationUrl({
      ...urlContext,
      scopes: ['openid', 'profile', 'email']
    });
    expect(new URL(oidcOnly.url).searchParams.get('scope')).toBe(
      'https://graph.microsoft.com/.default'
    );
  });

  it('keeps a specific tenant for admin consent', async () => {
    let { url } = await createOauth({
      tenant: 'common',
      allowTenantInput: true
    }).adminSetup!.getAuthorizationUrl({ ...urlContext, input: { tenantId: 'contoso.com' } });

    expect(new URL(url).pathname).toBe('/contoso.com/v2.0/adminconsent');
  });

  it('verifies a granted admin consent with a client-credentials token for the tenant', async () => {
    tokenPost.mockResolvedValueOnce({ data: { access_token: 'app-token' } });
    let oauth = createOauth({ tenant: 'organizations' });

    await expect(
      oauth.adminSetup!.handleCallback({
        ...callbackCredentials,
        callbackParams: { admin_consent: 'True', tenant: tenantId, state: 'state-123' }
      })
    ).resolves.toEqual({});

    expect(tokenPost).toHaveBeenCalledTimes(1);
    let [baseURL, path, body] = tokenPost.mock.calls[0]!;
    expect(`${baseURL}${path}`).toBe(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    );
    expect(Object.fromEntries(new URLSearchParams(body as string))).toEqual({
      client_id: 'client-id',
      client_secret: 'client-secret',
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default'
    });
  });

  it('retries verification while the new service principal replicates to the tenant', async () => {
    vi.useFakeTimers();
    tokenPost
      .mockRejectedValueOnce(appNotInTenantError)
      .mockResolvedValueOnce({ data: { access_token: 'app-token' } });
    let oauth = createOauth({ tenant: 'organizations' });

    let pending = oauth.adminSetup!.handleCallback({
      ...callbackCredentials,
      callbackParams: { admin_consent: 'True', tenant: tenantId }
    });
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toEqual({});
    expect(tokenPost).toHaveBeenCalledTimes(2);
  });

  it('rejects admin consent when the app is still not registered in the tenant after retrying with backoff for about 15 seconds', async () => {
    vi.useFakeTimers();
    tokenPost.mockRejectedValue(appNotInTenantError);
    let oauth = createOauth({ tenant: 'organizations' });

    let settled = false;
    let pending = oauth
      .adminSetup!.handleCallback({
        ...callbackCredentials,
        callbackParams: { admin_consent: 'True', tenant: tenantId }
      })
      .catch(e => e)
      .finally(() => {
        settled = true;
      });

    await vi.advanceTimersByTimeAsync(0);
    expect(tokenPost).toHaveBeenCalledTimes(1);
    for (let [index, delayMs] of [1000, 2000, 4000, 8000].entries()) {
      await vi.advanceTimersByTimeAsync(delayMs - 1);
      expect(tokenPost).toHaveBeenCalledTimes(index + 1);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(tokenPost).toHaveBeenCalledTimes(index + 2);
    }
    let error = await pending;

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.upstreamCode).toBe('AADSTS700016');
    expect(error.data.message).toMatch(/^Admin consent could not be verified/);
    expect(tokenPost).toHaveBeenCalledTimes(5);
  });

  it('rejects admin consent when the token request fails for another reason', async () => {
    tokenPost.mockRejectedValueOnce(new Error('socket hang up'));
    let oauth = createOauth({ tenant: 'organizations' });

    let error = await oauth
      .adminSetup!.handleCallback({
        ...callbackCredentials,
        callbackParams: { admin_consent: 'True', tenant: 'contoso.onmicrosoft.com' }
      })
      .catch(e => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.message).toBe('Admin consent could not be verified: socket hang up');
    expect(tokenPost).toHaveBeenCalledTimes(1);
  });

  it('rejects admin consent with a missing or malformed tenant without calling Microsoft', async () => {
    let oauth = createOauth({ tenant: 'organizations' });

    for (let tenant of [undefined, '', 'evil.com/../x', 'not a tenant', 'common?x=1']) {
      await expect(
        oauth.adminSetup!.handleCallback({
          ...callbackCredentials,
          callbackParams: {
            admin_consent: 'True',
            ...(tenant === undefined ? {} : { tenant })
          }
        })
      ).rejects.toBeInstanceOf(ServiceError);
    }

    expect(tokenPost).not.toHaveBeenCalled();
  });

  it('surfaces the Microsoft error from a denied admin consent callback', async () => {
    let oauth = createOauth({ tenant: 'organizations' });

    let error = await oauth
      .adminSetup!.handleCallback({
        ...callbackCredentials,
        callbackParams: {
          error: 'access_denied',
          error_description: 'The admin canceled the request.'
        }
      })
      .catch(e => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data).toMatchObject({
      upstreamCode: 'access_denied',
      message: 'The admin canceled the request.'
    });
  });

  it('rejects a callback that does not confirm admin consent', async () => {
    let oauth = createOauth({ tenant: 'organizations' });

    for (let callbackParams of [undefined, { admin_consent: 'False' }]) {
      await expect(
        oauth.adminSetup!.handleCallback({ ...callbackCredentials, callbackParams })
      ).rejects.toBeInstanceOf(ServiceError);
    }
  });
});
