import { describe, expect, it, vi } from 'vitest';
import { type AuthSetupRuntimeDependencies, runAuthSetupWithDependencies } from './auth';

let authMethod = {
  id: 'google_oauth',
  name: 'Google OAuth',
  type: 'auth.oauth',
  inputSchema: {},
  scopes: [
    { id: 'scope:two', title: 'Scope two' },
    { id: 'scope:denied', title: 'Denied scope' }
  ],
  capabilities: {
    getDefaultInput: { enabled: false },
    handleChangedInput: { enabled: false },
    getProfile: { enabled: true }
  }
};

let existingAuth = {
  id: 'auth-1',
  authMethodId: 'google_oauth',
  authMethodName: 'Google OAuth',
  authType: 'auth.oauth',
  input: { developerToken: 'existing-developer-token' },
  output: {
    token: 'old-access-token',
    refreshToken: 'existing-refresh-token',
    developerToken: 'existing-developer-token'
  },
  scopes: ['openid', 'scope:one'],
  clientId: 'client-id',
  clientSecret: 'client-secret',
  callbackState: null,
  profile: { id: 'google-user-1', email: 'person@example.com' },
  createdAt: '2026-09-02T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z'
};

let createScenario = (profile = existingAuth.profile) => {
  let storedAuth: Record<string, unknown> | null = null;
  let store = {
    getAuth: vi.fn(() => existingAuth),
    getOAuthCredential: vi.fn(() => null),
    upsertAuth: vi.fn((_profileId: string, auth: Record<string, unknown>) => {
      storedAuth = auth;
      return auth;
    }),
    save: vi.fn(async () => undefined)
  };
  let client = {
    clearAuth: vi.fn(),
    getAuthorizationUrl: vi.fn(async () => ({
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth'
    })),
    handleAuthorizationCallback: vi.fn(async () => ({
      output: {
        token: 'new-access-token',
        refreshToken: undefined,
        developerToken: 'existing-developer-token'
      },
      input: { developerToken: 'existing-developer-token' },
      scopes: ['scope:two']
    })),
    getAuthProfile: vi.fn(async () => ({ profile }))
  };
  let callback = {
    redirectUri: 'http://127.0.0.1:45873/callback',
    state: 'oauth-state',
    wait: vi.fn(async () => ({
      code: 'authorization-code',
      state: 'oauth-state',
      callbackParams: { code: 'authorization-code', state: 'oauth-state' }
    }))
  };
  let createClientContext = vi.fn(async () => ({
    store,
    profile: { id: 'profile-1' },
    client
  }));
  let chooseAuthMethod = vi.fn(async () => authMethod);
  let chooseScopes = vi.fn(async (_method, scopes: string[]) => scopes);
  let createOAuthCallbackListener = vi.fn(async () => callback);
  let printBrowserUrl = vi.fn();
  let dependencies = {
    createClientContext,
    chooseAuthMethod,
    chooseScopes,
    createOAuthCallbackListener,
    printBrowserUrl
  } as unknown as AuthSetupRuntimeDependencies;

  return {
    store,
    client,
    callback,
    dependencies,
    createOAuthCallbackListener,
    getStoredAuth: () => storedAuth
  };
};

describe('incremental OAuth setup orchestration', () => {
  it('reuses input and credentials, then stores only actually granted scopes', async () => {
    let scenario = createScenario();

    await runAuthSetupWithDependencies(
      {
        integration: 'super-booble-2',
        authMethodId: 'google_oauth',
        incremental: true,
        scopes: 'scope:two,scope:denied'
      },
      scenario.dependencies
    );

    expect(scenario.client.getAuthorizationUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        input: existingAuth.input,
        clientId: 'client-id',
        clientSecret: 'client-secret',
        scopes: ['scope:two', 'scope:denied']
      })
    );
    expect(scenario.client.handleAuthorizationCallback).toHaveBeenCalledWith(
      expect.objectContaining({ input: existingAuth.input })
    );
    expect(scenario.getStoredAuth()).toEqual(
      expect.objectContaining({
        input: existingAuth.input,
        output: {
          token: 'new-access-token',
          refreshToken: 'existing-refresh-token',
          developerToken: 'existing-developer-token'
        },
        scopes: ['openid', 'scope:one', 'scope:two'],
        profile: existingAuth.profile
      })
    );
    expect(scenario.store.save).toHaveBeenCalledOnce();
  });

  it('rejects a different client ID before opening a callback listener or persisting', async () => {
    let scenario = createScenario();

    await expect(
      runAuthSetupWithDependencies(
        {
          integration: 'super-booble-2',
          authMethodId: 'google_oauth',
          incremental: true,
          scopes: 'scope:two',
          clientId: 'different-client-id',
          clientSecret: 'different-client-secret'
        },
        scenario.dependencies
      )
    ).rejects.toThrow('must use the same OAuth client ID');

    expect(scenario.createOAuthCallbackListener).not.toHaveBeenCalled();
    expect(scenario.store.upsertAuth).not.toHaveBeenCalled();
    expect(scenario.store.save).not.toHaveBeenCalled();
  });

  it('rejects an auth input override before authorization begins', async () => {
    let scenario = createScenario();

    await expect(
      runAuthSetupWithDependencies(
        {
          integration: 'super-booble-2',
          authMethodId: 'google_oauth',
          incremental: true,
          scopes: 'scope:two',
          input: JSON.stringify({ developerToken: 'replacement-developer-token' })
        },
        scenario.dependencies
      )
    ).rejects.toThrow('reuses the existing authentication input');

    expect(scenario.createOAuthCallbackListener).not.toHaveBeenCalled();
    expect(scenario.store.upsertAuth).not.toHaveBeenCalled();
  });

  it('rejects a different Google account without merging or persisting its token', async () => {
    let scenario = createScenario({
      id: 'google-user-2',
      email: 'other@example.com'
    });

    await expect(
      runAuthSetupWithDependencies(
        {
          integration: 'super-booble-2',
          authMethodId: 'google_oauth',
          incremental: true,
          scopes: 'scope:two'
        },
        scenario.dependencies
      )
    ).rejects.toThrow('returned a different Google account');

    expect(scenario.client.handleAuthorizationCallback).toHaveBeenCalledOnce();
    expect(scenario.store.upsertAuth).not.toHaveBeenCalled();
    expect(scenario.store.save).not.toHaveBeenCalled();
  });
});
