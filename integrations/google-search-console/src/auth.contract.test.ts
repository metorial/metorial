import { createLocalSlateTestClient } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleSearchConsoleScopes } from './scopes';

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
          return {
            post: oauthPost
          };
        }

        if (config?.baseURL === 'https://www.googleapis.com') {
          return {
            get: profileGet
          };
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

describe('google-search-console auth contract', () => {
  it('builds the expected OAuth authorization URL', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      authenticationMethodId: 'oauth',
      redirectUri: 'https://example.com/callback',
      state: 'state-123',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [
        googleSearchConsoleScopes.webmastersReadonly,
        googleSearchConsoleScopes.userInfoEmail
      ]
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(url.searchParams.get('scope')).toBe(
      `${googleSearchConsoleScopes.webmastersReadonly} ${googleSearchConsoleScopes.userInfoEmail}`
    );
  });

  it('maps callback and refresh token responses into the stored auth shape', async () => {
    let client = await loadProviderClient();

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: `${googleSearchConsoleScopes.webmasters} ${googleSearchConsoleScopes.userInfoProfile}`
      }
    });

    let callbackResult = await client.handleAuthorizationCallback({
      authenticationMethodId: 'oauth',
      code: 'auth-code',
      state: 'state-123',
      redirectUri: 'https://example.com/callback',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleSearchConsoleScopes.webmasters]
    });

    expect(callbackResult.output).toMatchObject({
      token: 'access-token',
      refreshToken: 'refresh-token'
    });
    expect(callbackResult.scopes).toEqual([
      googleSearchConsoleScopes.webmasters,
      googleSearchConsoleScopes.userInfoProfile
    ]);
    expect(Date.parse(String(callbackResult.output.expiresAt))).toBeGreaterThan(Date.now());

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'refreshed-token',
        expires_in: 1800
      }
    });

    let refreshResult = await client.refreshToken({
      authenticationMethodId: 'oauth',
      output: {
        token: 'stale-token',
        refreshToken: 'refresh-token'
      },
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleSearchConsoleScopes.webmasters]
    });

    expect(refreshResult.output).toMatchObject({
      token: 'refreshed-token',
      refreshToken: 'refresh-token'
    });
    expect(Date.parse(String(refreshResult.output.expiresAt))).toBeGreaterThan(Date.now());
  });

  it('returns the existing output when refreshing without a refresh token', async () => {
    let client = await loadProviderClient();

    let refreshResult = await client.refreshToken({
      authenticationMethodId: 'oauth',
      output: {
        token: 'only-access'
      },
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleSearchConsoleScopes.webmastersReadonly]
    });

    expect(refreshResult.output).toEqual({ token: 'only-access' });
    expect(oauthPost).not.toHaveBeenCalled();
  });

  it('maps the Google profile payload into the Slate profile shape', async () => {
    let client = await loadProviderClient();

    profileGet.mockResolvedValueOnce({
      data: {
        id: 'user-123',
        email: 'gsc-test@example.com',
        name: 'GSC Test User',
        picture: 'https://example.com/avatar.png'
      }
    });

    let result = await client.getAuthProfile({
      authenticationMethodId: 'oauth',
      output: {
        token: 'profile-token'
      },
      input: {},
      scopes: [googleSearchConsoleScopes.userInfoProfile]
    });

    expect(result.profile).toEqual({
      id: 'user-123',
      email: 'gsc-test@example.com',
      name: 'GSC Test User',
      imageUrl: 'https://example.com/avatar.png'
    });
  });
});
