import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleCloudFunctionsScopes } from './scopes';

let oauthPost = vi.fn();
let profileGet = vi.fn();

let loadProviderClient = async () => {
  vi.resetModules();
  oauthPost.mockReset();
  profileGet.mockReset();

  vi.doMock('slates', async () => {
    let actual = await vi.importActual<typeof import('slates')>('slates');

    return {
      ...actual,
      createAxios: vi.fn((config?: { baseURL?: string }) => {
        if (config?.baseURL === 'https://oauth2.googleapis.com') {
          return { post: oauthPost };
        }

        if (config?.baseURL === 'https://www.googleapis.com') {
          return { get: profileGet };
        }

        return actual.createAxios(config);
      })
    };
  });

  let { provider } = await import('./index');
  return createLocalSlateTestClient({ slate: provider });
};

afterEach(() => {
  vi.doUnmock('slates');
  vi.resetModules();
});

describe('google-cloud-functions auth contract', () => {
  it('builds the expected OAuth authorization URL', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      authenticationMethodId: 'google_oauth',
      redirectUri: 'https://example.com/callback',
      state: 'state-123',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [
        googleCloudFunctionsScopes.cloudPlatformReadonly,
        googleCloudFunctionsScopes.userinfoEmail
      ]
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(url.searchParams.get('scope')).toBe(
      `${googleCloudFunctionsScopes.cloudPlatformReadonly} ${googleCloudFunctionsScopes.userinfoEmail}`
    );
  });

  it('maps callback and refresh token responses into the stored auth shape', async () => {
    let client = await loadProviderClient();

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: `${googleCloudFunctionsScopes.cloudPlatform} ${googleCloudFunctionsScopes.userinfoEmail}`
      }
    });

    let callbackResult = await client.handleAuthorizationCallback({
      authenticationMethodId: 'google_oauth',
      code: 'auth-code',
      state: 'state-123',
      redirectUri: 'https://example.com/callback',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleCloudFunctionsScopes.cloudPlatform]
    });

    expect(callbackResult.scopes).toEqual([
      googleCloudFunctionsScopes.cloudPlatform,
      googleCloudFunctionsScopes.userinfoEmail
    ]);
    expect(callbackResult.output).toMatchObject({
      token: 'access-token',
      refreshToken: 'refresh-token'
    });

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'refreshed-token',
        expires_in: 1800
      }
    });

    await client.refreshToken({
      authenticationMethodId: 'google_oauth',
      output: {
        token: 'stale-token',
        refreshToken: 'refresh-token'
      },
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleCloudFunctionsScopes.cloudPlatform]
    });
  });

  it('fails refreshes cleanly when no refresh token is stored', async () => {
    let client = await loadProviderClient();

    await expectSlateError(
      () =>
        client.refreshToken({
          authenticationMethodId: 'google_oauth',
          output: {
            token: 'stale-token'
          },
          input: {},
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scopes: [googleCloudFunctionsScopes.cloudPlatform]
        }),
      { code: 'internal.unexpected', kind: 'internal', status: 500 }
    );
  });

  it('maps the Google profile payload into the Slate profile shape', async () => {
    let client = await loadProviderClient();

    profileGet.mockResolvedValueOnce({
      data: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.png'
      }
    });

    let result = await client.getAuthProfile({
      authenticationMethodId: 'google_oauth',
      output: { token: 'profile-token' },
      input: {},
      scopes: [googleCloudFunctionsScopes.userinfoProfile]
    });

    expect(result.profile).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      imageUrl: 'https://example.com/avatar.png'
    });
  });
});
