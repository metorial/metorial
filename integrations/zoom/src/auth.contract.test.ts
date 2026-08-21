import { createLocalSlateTestClient } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

let authPost = vi.fn();

let loadProviderClient = async () => {
  vi.resetModules();
  authPost.mockReset();

  vi.doMock('@slates/provider', async () => {
    let actual = await vi.importActual<typeof import('@slates/provider')>('@slates/provider');

    return {
      ...actual,
      createAxios: vi.fn((config?: { baseURL?: string }) => {
        if (config?.baseURL === 'https://zoom.us') {
          return { post: authPost };
        }

        return actual.createAxios(config);
      })
    };
  });

  let { provider } = await import('./index');
  return createLocalSlateTestClient({ slate: provider as any });
};

afterEach(() => {
  vi.doUnmock('@slates/provider');
  vi.resetModules();
});

describe('Zoom webhook secret auth ownership', () => {
  it('keeps the secret token optional for tool-only OAuth records', async () => {
    let client = await loadProviderClient();
    let method = await client.getAuthMethod('oauth');

    expect(method.authenticationMethod.inputSchema.properties).toHaveProperty('secretToken');
    expect(method.authenticationMethod.inputSchema.required ?? []).not.toContain(
      'secretToken'
    );
  });

  it('persists the secret token through callback and refresh output replacement', async () => {
    let client = await loadProviderClient();
    authPost.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600
      }
    });

    let callback = await client.handleAuthorizationCallback({
      authenticationMethodId: 'oauth',
      code: 'auth-code',
      state: 'state',
      redirectUri: 'https://example.com/callback',
      input: { secretToken: 'zoom-secret-token' },
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: []
    });

    expect(callback.output).toMatchObject({
      token: 'access-token',
      refreshToken: 'refresh-token',
      secretToken: 'zoom-secret-token'
    });

    authPost.mockResolvedValueOnce({
      data: { access_token: 'refreshed-token', expires_in: 1800 }
    });
    let refreshed = await client.refreshToken({
      authenticationMethodId: 'oauth',
      output: callback.output,
      input: { secretToken: 'zoom-secret-token' },
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: []
    });

    expect(refreshed.output).toMatchObject({
      token: 'refreshed-token',
      refreshToken: 'refresh-token',
      secretToken: 'zoom-secret-token'
    });
  });
});
