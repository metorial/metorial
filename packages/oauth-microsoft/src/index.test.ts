import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildMicrosoftGraphUploadBody,
  createMicrosoftAdminConsent,
  createMicrosoftGraphOauth,
  type MicrosoftGraphOauthOptions,
  mapAzureDevOpsScopes,
  microsoftOauthBaseUrl,
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

let AZURE_DEVOPS_RESOURCE = '499b84ac-1321-427f-aa17-267ca6975798';
let tenantId = '72f988bf-86f1-41af-91ab-2d7cd011db47';
let otherTenantId = '0d2f1a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b';
let consumersTenantId = '9188040d-6c67-4c5b-b112-36a304b66dad';
let unsafeTenant = 'contoso/../evil';
let encodedUnsafeTenant = 'contoso%2F..%2Fevil';

let credentials = { clientId: 'client-id', clientSecret: 'client-secret' };

let authorizationUrlContext = {
  clientId: 'client-id',
  redirectUri: 'http://127.0.0.1:45873/callback',
  scopes: ['User.Read'],
  state: 'state-123',
  input: {}
};

let callbackContext = {
  ...credentials,
  redirectUri: 'http://127.0.0.1:45873/callback',
  scopes: ['User.Read'],
  code: 'auth-code',
  input: {}
};

let refreshContext = {
  ...credentials,
  scopes: ['User.Read'],
  input: {},
  output: { token: 'old-token', refreshToken: 'refresh-token' }
};

let grantedCallback = {
  ...credentials,
  callbackParams: { admin_consent: 'True', tenant: tenantId, state: 'state-123' }
};

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

let azureDevOpsOptions: MicrosoftGraphOauthOptions = {
  name: 'Azure DevOps',
  key: 'oauth_organizations',
  tenant: 'organizations',
  scopes: [],
  scopeMapper: mapAzureDevOpsScopes,
  extraScopes: ['offline_access']
};

let withConfigTenant = <Context extends object>(ctx: Context, configTenantId: string) => ({
  ...ctx,
  config: { tenantId: configTenantId }
});

let createOauth = (overrides: Partial<MicrosoftGraphOauthOptions> = {}) =>
  createMicrosoftGraphOauth({
    name: 'Teams',
    key: 'oauth',
    tenant: 'organizations',
    scopes: [],
    normalizeRedirectUri: true,
    ...overrides
  });

let createAdminSetup = (overrides: Partial<MicrosoftGraphOauthOptions> = {}) => {
  let { adminSetup } = createOauth({ adminConsent: true, ...overrides });
  if (!adminSetup) throw new Error('Expected admin setup to be enabled.');
  return adminSetup;
};

let endpoint = (url: string) => {
  let parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}`;
};

let lastTokenRequest = () => {
  let [baseURL, path, body] = tokenPost.mock.calls.at(-1)!;
  return {
    url: `${baseURL}${path}`,
    body: Object.fromEntries(new URLSearchParams(body as string))
  };
};

afterEach(() => {
  tokenPost.mockReset();
  vi.useRealTimers();
});

describe('Microsoft OAuth helpers', () => {
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

  it.each([
    ['microsoft-fabric', true],
    ['sharepoint', true],
    ['github', false]
  ])('reports whether %s uses Microsoft OAuth', (integration, expected) => {
    expect(usesMicrosoftOAuth(integration)).toBe(expected);
  });

  it.each([
    ['outlook', 'http://localhost:45873/callback'],
    ['microsoft-fabric', 'http://localhost:45873/callback'],
    ['github', 'http://127.0.0.1:45873/callback']
  ])('normalizes redirect URIs for %s only when it uses Microsoft OAuth', (integration, expected) => {
    expect(
      normalizeMicrosoftRedirectUriForIntegration(
        integration,
        'http://127.0.0.1:45873/callback'
      )
    ).toBe(expected);
  });

  it.each([
    [undefined, 'common'],
    ['   ', 'organizations']
  ])('uses the default tenant when the tenant is %j', (tenant, defaultTenant) => {
    expect(resolveMicrosoftTenant(tenant, defaultTenant)).toBe(defaultTenant);
  });

  it('uses a trimmed tenant override when provided', () => {
    expect(resolveMicrosoftTenant(' contoso.com ', 'common')).toBe('contoso.com');
  });

  it('builds the encoded OAuth endpoint base for a tenant', () => {
    expect(microsoftOauthBaseUrl(` ${unsafeTenant} `)).toBe(
      `https://login.microsoftonline.com/${encodedUnsafeTenant}/oauth2/v2.0`
    );
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
    expect(buildMicrosoftGraphUploadBody('notes.txt', 'SGVsbG8=', 'text/plain')).toBe(
      'SGVsbG8='
    );
  });
});

describe('createMicrosoftGraphOauth', () => {
  it('can normalize redirect URIs', async () => {
    let { url } = await createOauth({ tenant: 'common' }).getAuthorizationUrl(
      authorizationUrlContext
    );

    expect(new URL(url).searchParams.get('redirect_uri')).toBe(
      'http://localhost:45873/callback'
    );
  });

  it('builds Azure DevOps resource-qualified scopes with offline access', async () => {
    let { url } = await createMicrosoftGraphOauth(azureDevOpsOptions).getAuthorizationUrl({
      ...authorizationUrlContext,
      scopes: ['vso.profile']
    });

    expect(endpoint(url)).toBe(
      'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize'
    );
    expect(new URL(url).searchParams.get('scope')).toBe(
      `${AZURE_DEVOPS_RESOURCE}/vso.profile offline_access`
    );
  });

  it('can preserve OAuth output when a refresh token is missing', async () => {
    let output = { token: 'existing-token' };
    let oauth = createOauth({ onMissingRefreshToken: 'preserve' });

    await expect(oauth.handleTokenRefresh({ ...refreshContext, output })).resolves.toEqual({
      output
    });
  });

  it('uses the input tenant over the config tenant when tenant input is allowed', async () => {
    let { url } = await createOauth({
      tenant: 'common',
      allowTenantInput: true
    }).getAuthorizationUrl(
      withConfigTenant(
        { ...authorizationUrlContext, input: { tenantId: 'input.onmicrosoft.com' } },
        'config.onmicrosoft.com'
      )
    );

    expect(new URL(url).pathname).toBe('/input.onmicrosoft.com/oauth2/v2.0/authorize');
  });

  it('keeps sign-in on the method tenant when only a config tenant is set', async () => {
    let { url } = await createOauth({
      tenant: 'common',
      allowTenantInput: true
    }).getAuthorizationUrl(
      withConfigTenant(
        { ...authorizationUrlContext, input: { tenantId: '  ' } },
        'config.onmicrosoft.com'
      )
    );

    expect(new URL(url).pathname).toBe('/common/oauth2/v2.0/authorize');
  });

  it.each([
    '..',
    unsafeTenant,
    'not a tenant',
    'common?x=1'
  ])('ignores the invalid input tenant %j for sign-in and token requests', async inputTenant => {
    tokenPost.mockResolvedValue({ data: { access_token: 'token' } });
    let oauth = createOauth({ tenant: 'common', allowTenantInput: true });
    let input = { tenantId: inputTenant };

    let { url } = await oauth.getAuthorizationUrl({ ...authorizationUrlContext, input });
    expect(new URL(url).pathname).toBe('/common/oauth2/v2.0/authorize');

    await oauth.handleCallback({ ...callbackContext, input });
    expect(lastTokenRequest().url).toBe(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    );

    await oauth.handleTokenRefresh({ ...refreshContext, input });
    expect(lastTokenRequest().url).toBe(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    );
  });

  it.each([
    'consumers',
    consumersTenantId,
    consumersTenantId.toUpperCase()
  ])('keeps a work-only method on organizations for the personal-account input tenant %j', async inputTenant => {
    let { url } = await createOauth({
      tenant: 'organizations',
      allowTenantInput: true
    }).getAuthorizationUrl({ ...authorizationUrlContext, input: { tenantId: inputTenant } });

    expect(new URL(url).pathname).toBe('/organizations/oauth2/v2.0/authorize');
  });

  it.each([
    ['common', 'organizations'],
    [' COMMON ', 'organizations'],
    ['consumers', 'organizations'],
    [consumersTenantId, 'organizations'],
    ['contoso.onmicrosoft.com', 'contoso.onmicrosoft.com'],
    [tenantId, tenantId]
  ])('targets admin consent of a work-only method at config tenant %j as %j', async (configTenant, expectedTenant) => {
    let options = { tenant: 'organizations', allowTenantInput: true };
    let context = { ...authorizationUrlContext, config: { tenantId: configTenant } };

    let { url: consentUrl } = await createAdminSetup(options).getAuthorizationUrl(context);
    expect(new URL(consentUrl).pathname).toBe(`/${expectedTenant}/v2.0/adminconsent`);

    let { url: signInUrl } = await createOauth(options).getAuthorizationUrl(context);
    expect(new URL(signInUrl).pathname).toBe('/organizations/oauth2/v2.0/authorize');
  });

  it.each([
    'consumers',
    consumersTenantId
  ])('skips the personal-account input tenant %j on a work-only method and falls back to the config tenant for admin consent', async inputTenant => {
    let { url } = await createAdminSetup({
      tenant: 'organizations',
      allowTenantInput: true
    }).getAuthorizationUrl({
      ...authorizationUrlContext,
      input: { tenantId: inputTenant },
      config: { tenantId: 'contoso.onmicrosoft.com' }
    });

    expect(new URL(url).pathname).toBe('/contoso.onmicrosoft.com/v2.0/adminconsent');
  });

  it.each([
    [{ tenantId: '..' }, undefined],
    [{}, unsafeTenant]
  ])('rejects admin consent for invalid input %j or config tenant %j', async (input, configTenant) => {
    let context = { ...authorizationUrlContext, input };
    let error = await createAdminSetup({ tenant: 'organizations', allowTenantInput: true })
      .getAuthorizationUrl(configTenant ? withConfigTenant(context, configTenant) : context)
      .catch(e => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.message).toMatch(/needs a tenant ID or a verified domain/);
  });

  it('keeps the work-only tenant for token requests when the config tenant is common', async () => {
    tokenPost.mockResolvedValue({ data: { access_token: 'token' } });
    let oauth = createOauth({ tenant: 'organizations', allowTenantInput: true });

    await oauth.handleCallback(withConfigTenant(callbackContext, 'common'));
    expect(lastTokenRequest().url).toBe(
      'https://login.microsoftonline.com/organizations/oauth2/v2.0/token'
    );

    await oauth.handleTokenRefresh(withConfigTenant(refreshContext, 'common'));
    expect(lastTokenRequest().url).toBe(
      'https://login.microsoftonline.com/organizations/oauth2/v2.0/token'
    );
  });

  it('never overrides a specific tenant', async () => {
    let { url } = await createOauth({
      tenant: 'fabrikam.onmicrosoft.com',
      allowTenantInput: true
    }).getAuthorizationUrl(
      withConfigTenant(
        { ...authorizationUrlContext, input: { tenantId: 'input.onmicrosoft.com' } },
        'config.onmicrosoft.com'
      )
    );

    expect(new URL(url).pathname).toBe('/fabrikam.onmicrosoft.com/oauth2/v2.0/authorize');
  });

  it('ignores input and config tenants unless tenant input is allowed', async () => {
    let { url } = await createOauth({ tenant: 'common' }).getAuthorizationUrl(
      withConfigTenant(
        { ...authorizationUrlContext, input: { tenantId: 'input.onmicrosoft.com' } },
        'config.onmicrosoft.com'
      )
    );

    expect(new URL(url).pathname).toBe('/common/oauth2/v2.0/authorize');
  });

  it('encodes the tenant in the authorize URL', async () => {
    let { url } = await createOauth({ tenant: unsafeTenant }).getAuthorizationUrl(
      authorizationUrlContext
    );

    expect(new URL(url).pathname).toBe(`/${encodedUnsafeTenant}/oauth2/v2.0/authorize`);
  });

  it('encodes the tenant in the authorization code token endpoint', async () => {
    tokenPost.mockResolvedValue({ data: { access_token: 'token' } });

    await createOauth({ tenant: unsafeTenant }).handleCallback(callbackContext);

    expect(lastTokenRequest().url).toBe(
      `https://login.microsoftonline.com/${encodedUnsafeTenant}/oauth2/v2.0/token`
    );
  });

  it('encodes the tenant in the refresh token endpoint', async () => {
    tokenPost.mockResolvedValue({ data: { access_token: 'token' } });

    await createOauth({ tenant: unsafeTenant }).handleTokenRefresh(refreshContext);

    expect(lastTokenRequest().url).toBe(
      `https://login.microsoftonline.com/${encodedUnsafeTenant}/oauth2/v2.0/token`
    );
  });
});

describe('createMicrosoftGraphOauth admin consent', () => {
  it('omits admin setup unless enabled', () => {
    expect(createOauth()).not.toHaveProperty('adminSetup');
  });

  it.each([
    [true, false],
    [{}, false],
    [{ required: true }, true]
  ])('marks admin setup from adminConsent %j as required: %j', (adminConsent, required) => {
    expect(createAdminSetup({ adminConsent }).required).toBe(required);
  });

  it('targets organizations for admin consent when a work-only config tenant is consumers', async () => {
    let { url } = await createAdminSetup({
      tenant: 'organizations',
      allowTenantInput: true
    }).getAuthorizationUrl({ ...authorizationUrlContext, config: { tenantId: 'consumers' } });

    expect(new URL(url).pathname).toBe('/organizations/v2.0/adminconsent');
  });

  it('builds the v2 admin consent URL with Graph-qualified scopes, swapping common for organizations', async () => {
    let { url } = await createAdminSetup({ tenant: 'common' }).getAuthorizationUrl({
      ...authorizationUrlContext,
      scopes: ['User.Read', 'openid', 'offline_access', 'ChannelMessage.Read.All']
    });

    expect(endpoint(url)).toBe(
      'https://login.microsoftonline.com/organizations/v2.0/adminconsent'
    );
    expect(Object.fromEntries(new URL(url).searchParams)).toEqual({
      client_id: 'client-id',
      redirect_uri: 'http://localhost:45873/callback',
      state: 'state-123',
      scope:
        'https://graph.microsoft.com/User.Read https://graph.microsoft.com/ChannelMessage.Read.All'
    });
  });

  it('maps scopes like the sign-in flow and drops the extra OIDC scopes', async () => {
    let { url } = await createAdminSetup(azureDevOpsOptions).getAuthorizationUrl({
      ...authorizationUrlContext,
      scopes: ['vso.code_manage', 'vso.profile']
    });

    expect(new URL(url).searchParams.get('scope')).toBe(
      `${AZURE_DEVOPS_RESOURCE}/vso.code_manage ${AZURE_DEVOPS_RESOURCE}/vso.profile`
    );
  });

  it('falls back to the Graph .default scope when only OIDC scopes are requested', async () => {
    let { url } = await createAdminSetup().getAuthorizationUrl({
      ...authorizationUrlContext,
      scopes: ['openid', 'profile', 'email']
    });

    expect(new URL(url).searchParams.get('scope')).toBe(
      'https://graph.microsoft.com/.default'
    );
  });

  it('keeps a specific tenant from input for admin consent', async () => {
    let { url } = await createAdminSetup({
      tenant: 'common',
      allowTenantInput: true
    }).getAuthorizationUrl({ ...authorizationUrlContext, input: { tenantId: 'contoso.com' } });

    expect(new URL(url).pathname).toBe('/contoso.com/v2.0/adminconsent');
  });

  it('rejects an invalid method tenant for admin consent', async () => {
    await expect(
      createAdminSetup({ tenant: unsafeTenant }).getAuthorizationUrl(authorizationUrlContext)
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('rejects consent granted in a tenant other than the configured one', async () => {
    let error = await createAdminSetup({ tenant: 'organizations', allowTenantInput: true })
      .handleCallback(withConfigTenant(grantedCallback, otherTenantId))
      .catch(e => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.message).toMatch(/different Microsoft Entra tenant/);
    expect(tokenPost).not.toHaveBeenCalled();
  });

  it('accepts consent granted in the configured tenant', async () => {
    tokenPost.mockResolvedValueOnce({ data: { access_token: 'app-token' } });

    await expect(
      createAdminSetup({ tenant: 'organizations', allowTenantInput: true }).handleCallback(
        withConfigTenant(grantedCallback, tenantId.toUpperCase())
      )
    ).resolves.toEqual({});
  });

  it('verifies a granted admin consent with a Graph client-credentials token for the tenant', async () => {
    tokenPost.mockResolvedValueOnce({ data: { access_token: 'app-token' } });

    await expect(createAdminSetup().handleCallback(grantedCallback)).resolves.toEqual({});

    expect(tokenPost).toHaveBeenCalledTimes(1);
    expect(lastTokenRequest()).toEqual({
      url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      body: {
        client_id: 'client-id',
        client_secret: 'client-secret',
        grant_type: 'client_credentials',
        scope: 'https://graph.microsoft.com/.default'
      }
    });
  });

  it('verifies non-Graph consent against Graph too', async () => {
    tokenPost.mockResolvedValueOnce({ data: { access_token: 'app-token' } });

    await createAdminSetup(azureDevOpsOptions).handleCallback(grantedCallback);

    expect(lastTokenRequest().body.scope).toBe('https://graph.microsoft.com/.default');
  });

  it('retries verification while the new service principal replicates to the tenant', async () => {
    vi.useFakeTimers();
    tokenPost
      .mockRejectedValueOnce(appNotInTenantError)
      .mockResolvedValueOnce({ data: { access_token: 'app-token' } });

    let pending = createAdminSetup().handleCallback(grantedCallback);
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toEqual({});
    expect(tokenPost).toHaveBeenCalledTimes(2);
  });

  it('rejects admin consent when the app is still not registered in the tenant after retrying with backoff for about 15 seconds', async () => {
    vi.useFakeTimers();
    tokenPost.mockRejectedValue(appNotInTenantError);

    let settled = false;
    let pending = createAdminSetup()
      .handleCallback(grantedCallback)
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

    let error = await createAdminSetup()
      .handleCallback({
        ...credentials,
        callbackParams: { admin_consent: 'True', tenant: 'contoso.onmicrosoft.com' }
      })
      .catch(e => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.message).toBe('Admin consent could not be verified: socket hang up');
    expect(tokenPost).toHaveBeenCalledTimes(1);
  });

  it.each([
    undefined,
    '',
    'evil.com/../x',
    'not a tenant',
    'common?x=1',
    'organizations',
    consumersTenantId
  ])('rejects admin consent for tenant %j without calling Microsoft', async tenant => {
    await expect(
      createAdminSetup().handleCallback({
        ...credentials,
        callbackParams: { admin_consent: 'True', ...(tenant === undefined ? {} : { tenant }) }
      })
    ).rejects.toBeInstanceOf(ServiceError);

    expect(tokenPost).not.toHaveBeenCalled();
  });

  it('surfaces the Microsoft error from a denied admin consent callback', async () => {
    let error = await createAdminSetup()
      .handleCallback({
        ...credentials,
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
    expect(tokenPost).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    { admin_consent: 'False' }
  ])('rejects a callback with params %j that do not confirm admin consent', async callbackParams => {
    await expect(
      createAdminSetup().handleCallback({ ...credentials, callbackParams })
    ).rejects.toBeInstanceOf(ServiceError);
  });
});

describe('createMicrosoftAdminConsent', () => {
  let powerBiScopes = [
    'https://analysis.windows.net/powerbi/api/Report.Read.All',
    'offline_access'
  ];

  let requiredPermissions = [
    { api: 'Microsoft Graph', permissions: ['Sites.ReadWrite.All', 'User.Read'] },
    { api: 'SharePoint', permissions: ['AllSites.Manage'] }
  ];

  let requiredPermissionsInstructions = [
    'Admin consent was granted. The Microsoft Entra app registration needs these delegated permissions under **API permissions**:',
    '',
    '- **Microsoft Graph**: `Sites.ReadWrite.All`, `User.Read`',
    '- **SharePoint**: `AllSites.Manage`',
    '',
    'If any are missing, ask the owner of the app registration to add them, then grant admin consent again.'
  ].join('\n');

  it.each([
    [undefined, false],
    [false, false],
    [true, true]
  ])('passes required %j through as %j', (required, expected) => {
    expect(createMicrosoftAdminConsent({ tenant: 'organizations', required }).required).toBe(
      expected
    );
  });

  it('builds the v2 admin consent URL from the requested resource scopes', async () => {
    let { url } = await createMicrosoftAdminConsent({
      tenant: 'organizations'
    }).getAuthorizationUrl({ ...authorizationUrlContext, scopes: powerBiScopes });

    expect(endpoint(url)).toBe(
      'https://login.microsoftonline.com/organizations/v2.0/adminconsent'
    );
    expect(Object.fromEntries(new URL(url).searchParams)).toEqual({
      client_id: 'client-id',
      redirect_uri: 'http://127.0.0.1:45873/callback',
      state: 'state-123',
      scope: 'https://analysis.windows.net/powerbi/api/Report.Read.All'
    });
  });

  it('applies the scope mapper before qualifying scopes', async () => {
    let { url } = await createMicrosoftAdminConsent({
      tenant: 'organizations',
      scopeMapper: mapAzureDevOpsScopes
    }).getAuthorizationUrl({ ...authorizationUrlContext, scopes: ['vso.profile'] });

    expect(new URL(url).searchParams.get('scope')).toBe(
      `${AZURE_DEVOPS_RESOURCE}/vso.profile`
    );
  });

  it.each([
    ['common', 'organizations'],
    [' COMMON ', 'organizations'],
    ['organizations', 'organizations'],
    [' contoso.onmicrosoft.com ', 'contoso.onmicrosoft.com'],
    [tenantId, tenantId]
  ])('uses the %j tenant as %j for admin consent', async (tenant, expectedTenant) => {
    let { url } = await createMicrosoftAdminConsent({ tenant }).getAuthorizationUrl(
      authorizationUrlContext
    );

    expect(new URL(url).pathname).toBe(`/${expectedTenant}/v2.0/adminconsent`);
  });

  it.each([
    'consumers',
    ' Consumers ',
    consumersTenantId,
    consumersTenantId.toUpperCase()
  ])('rejects admin consent for the %j tenant', async tenant => {
    let error = await createMicrosoftAdminConsent({ tenant })
      .getAuthorizationUrl(authorizationUrlContext)
      .catch(e => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.message).toMatch(/requires a work or school tenant/);
  });

  it.each([
    unsafeTenant,
    '..',
    ''
  ])('rejects the invalid admin consent tenant %j before building the URL', async tenant => {
    let error = await createMicrosoftAdminConsent({
      tenant,
      mode: 'app-registration',
      requiredPermissions
    })
      .getAuthorizationUrl(authorizationUrlContext)
      .catch(e => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.message).toMatch(/needs a tenant ID or a verified domain/);
  });

  it.each([
    [tenantId, otherTenantId],
    ['contoso.onmicrosoft.com', 'fabrikam.onmicrosoft.com']
  ])('rejects consent for target tenant %j granted in %j', async (tenant, grantedTenant) => {
    let error = await createMicrosoftAdminConsent({ tenant })
      .handleCallback({
        ...credentials,
        callbackParams: { admin_consent: 'True', tenant: grantedTenant }
      })
      .catch(e => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.message).toMatch(/different Microsoft Entra tenant/);
    expect(tokenPost).not.toHaveBeenCalled();
  });

  it.each([
    [tenantId, tenantId.toUpperCase()],
    ['Contoso.onmicrosoft.com', 'contoso.onmicrosoft.com'],
    ['contoso.onmicrosoft.com', tenantId],
    ['organizations', otherTenantId]
  ])('verifies consent for target tenant %j granted in %j', async (tenant, grantedTenant) => {
    tokenPost.mockResolvedValueOnce({ data: { access_token: 'app-token' } });

    await createMicrosoftAdminConsent({ tenant }).handleCallback({
      ...credentials,
      callbackParams: { admin_consent: 'True', tenant: grantedTenant }
    });

    expect(lastTokenRequest().url).toBe(
      `https://login.microsoftonline.com/${grantedTenant}/oauth2/v2.0/token`
    );
  });

  it('resolves the target tenant from the slate config when verifying the callback', async () => {
    let adminConsent = createMicrosoftAdminConsent({
      tenant: ctx => resolveMicrosoftTenant(ctx.config?.tenantId, 'organizations')
    });

    let error = await adminConsent
      .handleCallback(withConfigTenant(grantedCallback, otherTenantId))
      .catch(e => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(tokenPost).not.toHaveBeenCalled();
  });

  it('builds the app registration admin consent URL without a scope parameter', async () => {
    let { url } = await createMicrosoftAdminConsent({
      tenant: 'contoso.onmicrosoft.com',
      mode: 'app-registration',
      requiredPermissions,
      normalizeRedirectUri: true
    }).getAuthorizationUrl(authorizationUrlContext);

    expect(endpoint(url)).toBe(
      'https://login.microsoftonline.com/contoso.onmicrosoft.com/adminconsent'
    );
    expect(Object.fromEntries(new URL(url).searchParams)).toEqual({
      client_id: 'client-id',
      redirect_uri: 'http://localhost:45873/callback',
      state: 'state-123'
    });
  });

  it('resolves the tenant from the slate config', async () => {
    let adminConsent = createMicrosoftAdminConsent({
      tenant: ctx => resolveMicrosoftTenant(ctx.config?.tenantId, 'common'),
      mode: 'app-registration',
      requiredPermissions
    });

    let { url } = await adminConsent.getAuthorizationUrl({
      ...authorizationUrlContext,
      config: { tenantId: 'contoso.onmicrosoft.com' }
    });

    expect(new URL(url).pathname).toBe('/contoso.onmicrosoft.com/adminconsent');
  });

  it('falls back to organizations when the configured tenant is missing', async () => {
    let adminConsent = createMicrosoftAdminConsent({
      tenant: ctx => resolveMicrosoftTenant(ctx.config?.tenantId, 'common'),
      mode: 'app-registration',
      requiredPermissions
    });

    let { url } = await adminConsent.getAuthorizationUrl(authorizationUrlContext);

    expect(new URL(url).pathname).toBe('/organizations/adminconsent');
  });

  it('requires the permissions list for app registration consent', () => {
    // @ts-expect-error app-registration consent has to tell the admin which permissions to check
    createMicrosoftAdminConsent({ tenant: 'organizations', mode: 'app-registration' });
  });

  it('renders the required permissions as instructions', async () => {
    tokenPost.mockResolvedValue({ data: { access_token: 'app-token' } });

    await expect(
      createMicrosoftAdminConsent({
        tenant: 'organizations',
        mode: 'app-registration',
        requiredPermissions
      }).handleCallback(grantedCallback)
    ).resolves.toEqual({ instructions: requiredPermissionsInstructions });
  });

  it('appends extra instructions after the required permissions', async () => {
    tokenPost.mockResolvedValue({ data: { access_token: 'app-token' } });

    await expect(
      createMicrosoftAdminConsent({
        tenant: 'organizations',
        requiredPermissions,
        instructions: 'Users also need an Azure RBAC role.'
      }).handleCallback(grantedCallback)
    ).resolves.toEqual({
      instructions: `${requiredPermissionsInstructions}\n\nUsers also need an Azure RBAC role.`
    });
  });

  it('returns no instructions when none are configured', async () => {
    tokenPost.mockResolvedValue({ data: { access_token: 'app-token' } });

    await expect(
      createMicrosoftAdminConsent({ tenant: 'organizations' }).handleCallback(grantedCallback)
    ).resolves.toEqual({});
  });

  it('does not verify consent when Microsoft reports an error', async () => {
    let error = await createMicrosoftAdminConsent({
      tenant: 'organizations',
      mode: 'app-registration',
      requiredPermissions
    })
      .handleCallback({ ...credentials, callbackParams: { error: 'consent_required' } })
      .catch(e => e);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.upstreamCode).toBe('consent_required');
    expect(tokenPost).not.toHaveBeenCalled();
  });
});
