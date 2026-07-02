import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleMeetScopes } from './scopes';

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

describe('google-meet auth contract', () => {
  it('builds the expected OAuth authorization URL', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      authenticationMethodId: 'google_oauth',
      redirectUri: 'https://example.com/callback',
      state: 'state-123',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleMeetScopes.spaceReadonly, googleMeetScopes.userInfoEmail]
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(url.searchParams.get('scope')).toBe(
      `${googleMeetScopes.spaceReadonly} ${googleMeetScopes.userInfoEmail}`
    );
  });

  it('maps callback and refresh token responses into the stored auth shape', async () => {
    let client = await loadProviderClient();

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: `${googleMeetScopes.spaceCreated} ${googleMeetScopes.userInfoEmail}`
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
      scopes: [googleMeetScopes.spaceCreated]
    });

    expect(callbackResult.output).toMatchObject({
      token: 'access-token',
      refreshToken: 'refresh-token'
    });
    expect(callbackResult.scopes).toEqual([
      googleMeetScopes.spaceCreated,
      googleMeetScopes.userInfoEmail
    ]);
    expect(Date.parse(String(callbackResult.output.expiresAt))).toBeGreaterThan(Date.now());

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'refreshed-token',
        expires_in: 1800
      }
    });

    let refreshResult = await client.refreshToken({
      authenticationMethodId: 'google_oauth',
      output: {
        token: 'stale-token',
        refreshToken: 'refresh-token'
      },
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleMeetScopes.spaceCreated]
    });

    expect(refreshResult.output).toMatchObject({
      token: 'refreshed-token',
      refreshToken: 'refresh-token'
    });
    expect(Date.parse(String(refreshResult.output.expiresAt))).toBeGreaterThan(Date.now());
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
          scopes: [googleMeetScopes.spaceReadonly]
        }),
      { code: 'request.bad', kind: 'request', status: 400 }
    );
  });

  it('maps the Google profile payload into the Slate profile shape', async () => {
    let client = await loadProviderClient();

    profileGet.mockResolvedValueOnce({
      data: {
        id: 'user-123',
        email: 'meet-test@example.com',
        name: 'Meet Test User',
        picture: 'https://example.com/avatar.png'
      }
    });

    let result = await client.getAuthProfile({
      authenticationMethodId: 'google_oauth',
      output: {
        token: 'profile-token'
      },
      input: {},
      scopes: [googleMeetScopes.userInfoProfile]
    });

    expect(result.profile).toEqual({
      id: 'user-123',
      email: 'meet-test@example.com',
      name: 'Meet Test User',
      imageUrl: 'https://example.com/avatar.png'
    });
  });
});
