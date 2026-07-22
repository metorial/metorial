import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

let fetchMock = vi.fn();
let createAxiosMock = vi.fn();

let authInput = {
  clientId: 'contract-client-id',
  clientSecret: 'contract-client-secret'
};

let loadProviderClient = async (
  config: Record<string, unknown> = {},
  authOutput?: Record<string, unknown>
) => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  createAxiosMock.mockReset();

  vi.doMock('slates', async () => {
    let actual = await vi.importActual<typeof import('slates')>('slates');

    return {
      ...actual,
      createAxios: createAxiosMock
    };
  });

  let { provider } = await import('./index');
  return createLocalSlateTestClient({
    slate: provider,
    state: {
      config,
      ...(authOutput
        ? {
            auth: {
              authenticationMethodId: 'api_key',
              output: authOutput
            }
          }
        : {})
    }
  });
};

let jsonResponse = (data: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data)
  }) as unknown as Response;

let successfulLogin = (token = 'contract-access-token', expiresIn = 3600) =>
  jsonResponse({
    access_token: token,
    expires_in: expiresIn
  });

let errorText = (error: unknown): string =>
  `${error instanceof Error ? error.message : String(error)}\n${JSON.stringify(error)}\n${
    typeof error === 'object' && error !== null && 'parent' in error
      ? errorText((error as { parent?: unknown }).parent)
      : ''
  }\n${
    typeof error === 'object' && error !== null && 'cause' in error
      ? errorText((error as { cause?: unknown }).cause)
      : ''
  }`;

let expectNoSecretLeak = (error: unknown, secrets: string[]) => {
  let rendered = errorText(error);
  for (let secret of secrets) {
    expect(rendered.includes(secret)).toBe(false);
  }
};

let expectLookerError = async (
  run: () => Promise<unknown>,
  reason: string,
  options: { upstreamStatus?: number; secrets?: string[] } = {}
) => {
  let expectedBaggage: Record<string, unknown> = {
    serviceError: {
      reason
    }
  };

  if (options.upstreamStatus !== undefined) {
    expectedBaggage.serviceErrorData = {
      upstreamStatus: options.upstreamStatus
    };
  }

  let error = await expectSlateError(run, {
    code: 'request.bad',
    kind: 'request',
    status: 400,
    baggage: expectedBaggage
  });

  expectNoSecretLeak(error, options.secrets ?? Object.values(authInput));
  return error;
};

let withoutExpectedConsoleError = async <Result>(
  run: () => Promise<Result>,
  secrets: string[]
) => {
  let consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    return await run();
  } finally {
    let calls = consoleError.mock.calls.map(args => args.map(errorText).join('\n'));
    consoleError.mockRestore();

    expectNoSecretLeak(calls.join('\n'), secrets);
  }
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('slates');
  vi.resetModules();
});

describe('looker auth contract', () => {
  it('publishes refresh and profile capabilities', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthMethod('api_key');
    let method = result.authenticationMethod;

    expect(method.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(method.capabilities.getProfile?.enabled).toBe(true);
  });

  it('requires the instance URL in auth input and keeps output fields backward-compatible', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthMethod('api_key');
    let method = result.authenticationMethod;
    let required = (method.inputSchema.required as string[] | undefined) ?? [];
    let outputRequired = (method.outputSchema.required as string[] | undefined) ?? [];

    // Production auth stacks never receive provider config, so the login URL
    // must come from the auth input.
    expect(required).toEqual(
      expect.arrayContaining(['clientId', 'clientSecret', 'instanceUrl'])
    );
    expect(method.inputSchema.properties?.instanceUrl).toMatchObject({ type: 'string' });
    expect(method.outputSchema.properties?.expiresAt).toMatchObject({ type: 'string' });
    expect(method.outputSchema.properties?.authenticatedInstanceUrl).toMatchObject({
      type: 'string'
    });
    expect(outputRequired).not.toContain('expiresAt');
    expect(outputRequired).not.toContain('authenticatedInstanceUrl');
  });

  it('rejects login without an auth-input instance URL even when config is set', async () => {
    // Production auth stacks run getOutput with an empty config, so a
    // config-only setup can never authenticate; the schema must reject it.
    let client = await loadProviderClient({
      instanceUrl: 'https://configured.looker.example/proxy/api/4.0/'
    });

    await expect(
      client.getAuthOutput({
        authenticationMethodId: 'api_key',
        input: authInput
      })
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts credentials in a URL-encoded form body without query parameters', async () => {
    let client = await loadProviderClient({
      instanceUrl: 'https://form.looker.example'
    });
    fetchMock.mockResolvedValueOnce(successfulLogin());

    await client.getAuthOutput({
      authenticationMethodId: 'api_key',
      input: {
        ...authInput,
        instanceUrl: 'https://form.looker.example/'
      }
    });

    let [url, requestConfig] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://form.looker.example/api/4.0/login');
    expect(typeof requestConfig?.body).toBe('string');
    expect(requestConfig?.redirect).toBe('error');

    let form = new URLSearchParams(requestConfig?.body);
    expect(form.get('client_id') === authInput.clientId).toBe(true);
    expect(form.get('client_secret') === authInput.clientSecret).toBe(true);
    expect([...form.keys()].sort()).toEqual(['client_id', 'client_secret']);
    expect(requestConfig).not.toHaveProperty('params');

    let headers = Object.entries(requestConfig?.headers ?? {});
    let contentType = headers.find(([key]) => key.toLowerCase() === 'content-type')?.[1];
    expect(String(contentType).toLowerCase()).toContain('application/x-www-form-urlencoded');
    expect(new URL(String(url)).search).toBe('');
  });

  it.each([
    {
      name: 'auth input only (production auth stacks run config-less)',
      config: {},
      input: {
        ...authInput,
        instanceUrl: 'https://legacy.looker.example/api/4.0/'
      },
      expectedBaseUrl: 'https://legacy.looker.example/api/4.0/login',
      expectedAuthenticatedUrl: 'https://legacy.looker.example'
    },
    {
      name: 'normalized-equivalent config and auth input',
      config: {
        instanceUrl: 'https://dual.looker.example/proxy/api/4.0/'
      },
      input: {
        ...authInput,
        instanceUrl: 'https://dual.looker.example/proxy/'
      },
      expectedBaseUrl: 'https://dual.looker.example/proxy/api/4.0/login',
      expectedAuthenticatedUrl: 'https://dual.looker.example/proxy'
    }
  ])('authenticates with $name', async ({
    config,
    input,
    expectedBaseUrl,
    expectedAuthenticatedUrl
  }) => {
    let client = await loadProviderClient(config);
    fetchMock.mockResolvedValueOnce(successfulLogin());

    let result = await client.getAuthOutput({
      authenticationMethodId: 'api_key',
      input
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expectedBaseUrl,
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.output.authenticatedInstanceUrl).toBe(expectedAuthenticatedUrl);
  });

  it('rejects truly different configured and legacy instance URLs', async () => {
    let client = await loadProviderClient({
      instanceUrl: 'https://configured.looker.example'
    });

    await expectLookerError(
      () =>
        client.getAuthOutput({
          authenticationMethodId: 'api_key',
          input: {
            ...authInput,
            instanceUrl: 'https://different.looker.example'
          }
        }),
      'looker_instance_url_mismatch'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stores a future expiry and refreshes by repeating the credential exchange', async () => {
    vi.useFakeTimers();
    let loginTime = new Date('2030-01-02T03:04:05.000Z');
    vi.setSystemTime(loginTime);

    try {
      let client = await loadProviderClient({
        instanceUrl: 'https://refresh.looker.example/'
      });
      fetchMock
        .mockResolvedValueOnce(successfulLogin('initial-access-token', 3600))
        .mockResolvedValueOnce(successfulLogin('refreshed-access-token', 7200));

      let initial = await client.getAuthOutput({
        authenticationMethodId: 'api_key',
        input: {
          ...authInput,
          instanceUrl: 'https://refresh.looker.example/'
        }
      });
      expect(initial.output.token === 'initial-access-token').toBe(true);
      expect(initial.output.expiresAt).toBe('2030-01-02T04:04:05.000Z');
      expect(initial.output.authenticatedInstanceUrl).toBe('https://refresh.looker.example');

      vi.setSystemTime(new Date('2030-01-02T03:04:35.000Z'));
      let refreshed = await client.refreshToken({
        authenticationMethodId: 'api_key',
        output: initial.output,
        input: authInput,
        clientId: 'protocol-client-id-is-not-the-looker-client-id',
        clientSecret: 'protocol-client-secret-is-not-the-looker-client-secret',
        scopes: []
      });

      expect(refreshed.output.token === 'refreshed-access-token').toBe(true);
      expect(refreshed.output.expiresAt).toBe('2030-01-02T05:04:35.000Z');
      expect(refreshed.output.authenticatedInstanceUrl).toBe('https://refresh.looker.example');
      expect(refreshed).not.toHaveProperty('requestTraces');
      expect(fetchMock).toHaveBeenCalledTimes(2);

      let [refreshUrl, refreshRequestConfig] = fetchMock.mock.calls[1] ?? [];
      expect(refreshUrl).toBe('https://refresh.looker.example/api/4.0/login');

      let refreshForm = new URLSearchParams(refreshRequestConfig?.body);
      expect(refreshForm.get('client_id') === authInput.clientId).toBe(true);
      expect(refreshForm.get('client_secret') === authInput.clientSecret).toBe(true);
      expect([...refreshForm.keys()].sort()).toEqual(['client_id', 'client_secret']);
      expect(refreshRequestConfig).not.toHaveProperty('params');

      let refreshHeaders = Object.entries(refreshRequestConfig?.headers ?? {});
      let refreshContentType = refreshHeaders.find(
        ([key]) => key.toLowerCase() === 'content-type'
      )?.[1];
      expect(String(refreshContentType).toLowerCase()).toContain(
        'application/x-www-form-urlencoded'
      );
      expect(new URL(String(refreshUrl)).search).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('loads and maps the profile through the normalized API base', async () => {
    let client = await loadProviderClient({
      instanceUrl: 'https://profile.looker.example/api/4.0/'
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 42,
        email: 'looker-user@example.com',
        display_name: 'Looker Contract User',
        first_name: 'Looker',
        last_name: 'User'
      })
    );

    let result = await client.getAuthProfile({
      authenticationMethodId: 'api_key',
      output: { token: 'profile-access-token' },
      input: authInput,
      scopes: []
    });

    let [profileUrl, profileRequestConfig] = fetchMock.mock.calls[0] ?? [];
    expect(profileUrl).toBe('https://profile.looker.example/api/4.0/user');
    expect(profileRequestConfig?.redirect).toBe('error');
    expect(profileRequestConfig?.headers?.Authorization === 'token profile-access-token').toBe(
      true
    );
    expect(result.profile).toMatchObject({
      id: '42',
      email: 'looker-user@example.com',
      name: 'Looker Contract User'
    });
    expect(result).not.toHaveProperty('requestTraces');
  });

  it('rejects refresh and profile requests after the configured instance drifts', async () => {
    let instanceA = 'https://bound-a.looker.example/proxy';
    let instanceB = 'https://bound-b.looker.example/proxy';
    let client = await loadProviderClient({ instanceUrl: instanceB });
    let output = {
      token: 'bound-instance-access-token',
      authenticatedInstanceUrl: instanceA
    };
    let secrets = [...Object.values(authInput), output.token, instanceA, instanceB];

    await expectLookerError(
      () =>
        client.refreshToken({
          authenticationMethodId: 'api_key',
          output,
          input: authInput,
          clientId: 'protocol-client-id',
          clientSecret: 'protocol-client-secret',
          scopes: []
        }),
      'looker_reauthentication_required',
      { secrets }
    );

    await expectLookerError(
      () =>
        client.getAuthProfile({
          authenticationMethodId: 'api_key',
          output,
          input: authInput,
          scopes: []
        }),
      'looker_reauthentication_required',
      { secrets }
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports reauthentication when config drifts but legacy input still matches the binding', async () => {
    let instanceA = 'https://retained-legacy-a.looker.example/proxy';
    let instanceB = 'https://drifted-config-b.looker.example/proxy';
    let token = 'retained-legacy-access-token';
    let client = await loadProviderClient({ instanceUrl: instanceB });
    let input = { ...authInput, instanceUrl: instanceA };
    let output = { token, authenticatedInstanceUrl: instanceA };
    let secrets = [...Object.values(input), token, instanceB];

    await expectLookerError(
      () =>
        client.refreshToken({
          authenticationMethodId: 'api_key',
          output,
          input,
          clientId: 'protocol-client-id',
          clientSecret: 'protocol-client-secret',
          scopes: []
        }),
      'looker_reauthentication_required',
      { secrets }
    );
    await expectLookerError(
      () =>
        client.getAuthProfile({
          authenticationMethodId: 'api_key',
          output,
          input,
          scopes: []
        }),
      'looker_reauthentication_required',
      { secrets }
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(createAxiosMock).not.toHaveBeenCalled();
  });

  it('rejects config drift for unbound legacy refresh and profile output', async () => {
    let instanceA = 'https://unbound-legacy-a.looker.example/proxy';
    let instanceB = 'https://unbound-config-b.looker.example/proxy';
    let token = 'unbound-legacy-access-token';
    let client = await loadProviderClient({ instanceUrl: instanceB });
    let input = { ...authInput, instanceUrl: instanceA };
    let output = { token };
    let secrets = [...Object.values(input), token, instanceB];

    await expectLookerError(
      () =>
        client.refreshToken({
          authenticationMethodId: 'api_key',
          output,
          input,
          clientId: 'protocol-client-id',
          clientSecret: 'protocol-client-secret',
          scopes: []
        }),
      'looker_instance_url_mismatch',
      { secrets }
    );
    await expectLookerError(
      () =>
        client.getAuthProfile({
          authenticationMethodId: 'api_key',
          output,
          input,
          scopes: []
        }),
      'looker_instance_url_mismatch',
      { secrets }
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(createAxiosMock).not.toHaveBeenCalled();
  });

  it('rejects explicit null instance bindings for refresh and profile', async () => {
    let instanceUrl = 'https://null-binding.looker.example/proxy';
    let token = 'null-binding-access-token';
    let client = await loadProviderClient({ instanceUrl });
    let output = {
      token,
      authenticatedInstanceUrl: null
    } as unknown as { token: string; authenticatedInstanceUrl: string };
    let secrets = [...Object.values(authInput), token, instanceUrl];

    await expectLookerError(
      () =>
        client.refreshToken({
          authenticationMethodId: 'api_key',
          output,
          input: authInput,
          clientId: 'protocol-client-id',
          clientSecret: 'protocol-client-secret',
          scopes: []
        }),
      'looker_reauthentication_required',
      { secrets }
    );
    await expectLookerError(
      () =>
        client.getAuthProfile({
          authenticationMethodId: 'api_key',
          output,
          input: authInput,
          scopes: []
        }),
      'looker_reauthentication_required',
      { secrets }
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(createAxiosMock).not.toHaveBeenCalled();
  });

  it('rejects a real tool invocation before constructing a client after instance drift', async () => {
    let instanceA = 'https://tool-bound-a.looker.example/proxy';
    let instanceB = 'https://tool-bound-b.looker.example/proxy';
    let token = 'tool-bound-access-token';
    let client = await loadProviderClient(
      { instanceUrl: instanceB },
      { token, authenticatedInstanceUrl: instanceA }
    );

    await expectLookerError(
      () => client.invokeTool('search_dashboards', { title: 'Revenue' }),
      'looker_reauthentication_required',
      { secrets: [instanceA, instanceB, token] }
    );

    expect(createAxiosMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts normalized-equivalent instance bindings for refresh and profile', async () => {
    let client = await loadProviderClient({
      instanceUrl: 'https://equivalent.looker.example/proxy/api/4.0/'
    });
    let output = {
      token: 'equivalent-access-token',
      authenticatedInstanceUrl: 'https://equivalent.looker.example/proxy/'
    };
    fetchMock
      .mockResolvedValueOnce(successfulLogin('equivalent-refreshed-token'))
      .mockResolvedValueOnce(
        jsonResponse({ id: 'equivalent-user', display_name: 'Equivalent User' })
      );

    let refreshed = await client.refreshToken({
      authenticationMethodId: 'api_key',
      output,
      input: authInput,
      clientId: 'protocol-client-id',
      clientSecret: 'protocol-client-secret',
      scopes: []
    });
    let profile = await client.getAuthProfile({
      authenticationMethodId: 'api_key',
      output,
      input: authInput,
      scopes: []
    });

    expect(refreshed.output.authenticatedInstanceUrl).toBe(
      'https://equivalent.looker.example/proxy'
    );
    expect(profile.profile.id).toBe('equivalent-user');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://equivalent.looker.example/proxy/api/4.0/login',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://equivalent.looker.example/proxy/api/4.0/user',
      expect.any(Object)
    );
  });

  it('refreshes and loads the profile from the stored binding when config and input URLs are absent', async () => {
    // Production runs refresh and profile callbacks with an empty config; a
    // connection must stay refreshable from its stored instance binding alone.
    let client = await loadProviderClient({});
    let output = {
      token: 'binding-only-access-token',
      authenticatedInstanceUrl: 'https://binding-only.looker.example/proxy'
    };
    fetchMock
      .mockResolvedValueOnce(successfulLogin('binding-refreshed-token'))
      .mockResolvedValueOnce(
        jsonResponse({ id: 'binding-user', display_name: 'Binding User' })
      );

    let refreshed = await client.refreshToken({
      authenticationMethodId: 'api_key',
      output,
      input: authInput,
      clientId: 'protocol-client-id',
      clientSecret: 'protocol-client-secret',
      scopes: []
    });
    let profile = await client.getAuthProfile({
      authenticationMethodId: 'api_key',
      output,
      input: authInput,
      scopes: []
    });

    expect(refreshed.output.token).toBe('binding-refreshed-token');
    expect(refreshed.output.authenticatedInstanceUrl).toBe(
      'https://binding-only.looker.example/proxy'
    );
    expect(profile.profile.id).toBe('binding-user');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://binding-only.looker.example/proxy/api/4.0/login',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://binding-only.looker.example/proxy/api/4.0/user',
      expect.any(Object)
    );
  });

  it.each([
    ['missing access token', { expires_in: 3600 }],
    ['empty access token', { access_token: '', expires_in: 3600 }],
    ['missing expires_in', { access_token: 'response-access-token' }],
    ['zero expires_in', { access_token: 'response-access-token', expires_in: 0 }],
    ['negative expires_in', { access_token: 'response-access-token', expires_in: -1 }],
    ['non-numeric expires_in', { access_token: 'response-access-token', expires_in: 'soon' }],
    ['string expires_in', { access_token: 'response-access-token', expires_in: '3600' }],
    [
      'infinite expires_in',
      { access_token: 'response-access-token', expires_in: Number.POSITIVE_INFINITY }
    ],
    ['NaN expires_in', { access_token: 'response-access-token', expires_in: Number.NaN }]
  ])('rejects a login response with %s', async (_name, data) => {
    let client = await loadProviderClient({
      instanceUrl: 'https://invalid-response.looker.example'
    });
    fetchMock.mockResolvedValueOnce(jsonResponse(data));

    await expectLookerError(
      () =>
        client.getAuthOutput({
          authenticationMethodId: 'api_key',
          input: {
            ...authInput,
            instanceUrl: 'https://invalid-response.looker.example'
          }
        }),
      'looker_auth_response_invalid',
      { secrets: [...Object.values(authInput), 'response-access-token'] }
    );
  });

  it.each([
    {
      name: 'invalid configured instance URL',
      config: { instanceUrl: 'http://insecure.looker.example' },
      input: { ...authInput, instanceUrl: 'https://secure.looker.example' },
      reason: 'looker_instance_url_invalid'
    },
    {
      name: 'invalid auth-input instance URL',
      config: {},
      input: { ...authInput, instanceUrl: 'not a URL' },
      reason: 'looker_instance_url_invalid'
    }
  ])('rejects $name before making a login request', async ({ config, input, reason }) => {
    let client = await loadProviderClient(config);

    await expectLookerError(
      () =>
        client.getAuthOutput({
          authenticationMethodId: 'api_key',
          input
        }),
      reason
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed profile without exposing the stored token', async () => {
    let client = await loadProviderClient({
      instanceUrl: 'https://malformed-profile.looker.example'
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        email: 'profile-without-id@example.com',
        display_name: 'Profile Without ID'
      })
    );

    await expectLookerError(
      () =>
        client.getAuthProfile({
          authenticationMethodId: 'api_key',
          output: { token: 'malformed-profile-access-token' },
          input: authInput,
          scopes: []
        }),
      'looker_profile_response_invalid',
      { secrets: [...Object.values(authInput), 'malformed-profile-access-token'] }
    );
  });

  it('maps upstream login failures to a redacted structured error', async () => {
    let instanceUrl = 'https://login-failure.looker.example';
    let client = await loadProviderClient({ instanceUrl });
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 401));

    await withoutExpectedConsoleError(
      () =>
        expectLookerError(
          () =>
            client.getAuthOutput({
              authenticationMethodId: 'api_key',
              input: {
                ...authInput,
                instanceUrl: 'https://login-failure.looker.example'
              }
            }),
          'looker_login_failed',
          { upstreamStatus: 401, secrets: [...Object.values(authInput), instanceUrl] }
        ),
      [...Object.values(authInput), instanceUrl]
    );
  });

  it('maps upstream refresh failures to a redacted structured error', async () => {
    let instanceUrl = 'https://refresh-failure.looker.example';
    let client = await loadProviderClient({ instanceUrl });
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 503));

    await withoutExpectedConsoleError(
      () =>
        expectLookerError(
          () =>
            client.refreshToken({
              authenticationMethodId: 'api_key',
              output: { token: 'stale-access-token' },
              input: authInput,
              clientId: 'protocol-client-id',
              clientSecret: 'protocol-client-secret',
              scopes: []
            }),
          'looker_refresh_failed',
          {
            upstreamStatus: 503,
            secrets: [...Object.values(authInput), 'stale-access-token', instanceUrl]
          }
        ),
      [...Object.values(authInput), 'stale-access-token', instanceUrl]
    );
  });

  it('maps upstream profile failures to a redacted structured error', async () => {
    let instanceUrl = 'https://profile-failure.looker.example';
    let client = await loadProviderClient({ instanceUrl });
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 502));

    await withoutExpectedConsoleError(
      () =>
        expectLookerError(
          () =>
            client.getAuthProfile({
              authenticationMethodId: 'api_key',
              output: { token: 'failed-profile-access-token' },
              input: authInput,
              scopes: []
            }),
          'looker_profile_failed',
          {
            upstreamStatus: 502,
            secrets: [...Object.values(authInput), 'failed-profile-access-token', instanceUrl]
          }
        ),
      [...Object.values(authInput), 'failed-profile-access-token', instanceUrl]
    );
  });

  it('drops sensitive network errors instead of retaining them as parents or traces', async () => {
    let instanceUrl = 'https://sensitive-network-error.looker.example/proxy';
    let token = 'sensitive-network-access-token';
    let credentialBody = `client_id=${authInput.clientId}&client_secret=${authInput.clientSecret}`;
    let secrets = [...Object.values(authInput), token, credentialBody, instanceUrl];
    let client = await loadProviderClient({ instanceUrl });
    let output = { token, authenticatedInstanceUrl: instanceUrl };

    await withoutExpectedConsoleError(async () => {
      fetchMock.mockRejectedValueOnce(
        new Error(`Network failure for ${instanceUrl}: ${credentialBody}`)
      );
      await expectLookerError(
        () =>
          client.getAuthOutput({
            authenticationMethodId: 'api_key',
            input: { ...authInput, instanceUrl }
          }),
        'looker_login_failed',
        { secrets }
      );

      fetchMock.mockRejectedValueOnce(
        new Error(`Refresh failure for ${instanceUrl} with ${token}: ${credentialBody}`)
      );
      await expectLookerError(
        () =>
          client.refreshToken({
            authenticationMethodId: 'api_key',
            output,
            input: authInput,
            clientId: 'protocol-client-id',
            clientSecret: 'protocol-client-secret',
            scopes: []
          }),
        'looker_refresh_failed',
        { secrets }
      );

      fetchMock.mockRejectedValueOnce(
        new Error(`Profile failure for ${instanceUrl} with ${token}`)
      );
      await expectLookerError(
        () =>
          client.getAuthProfile({
            authenticationMethodId: 'api_key',
            output,
            input: authInput,
            scopes: []
          }),
        'looker_profile_failed',
        { secrets }
      );
    }, secrets);
  });
});
