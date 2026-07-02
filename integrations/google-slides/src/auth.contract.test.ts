import { createLocalSlateTestClient } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleSlidesScopes } from './scopes';

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
        if (config?.baseURL === 'https://www.googleapis.com') {
          return {
            get: profileGet
          };
        }

        return {
          post: oauthPost,
          get: profileGet
        };
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

describe('google-slides auth contract', () => {
  it('builds the expected OAuth authorization URL', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      authenticationMethodId: 'google_oauth',
      redirectUri: 'https://example.com/callback',
      state: 'state-123',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleSlidesScopes.presentationsReadonly, googleSlidesScopes.userInfoEmail]
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(url.searchParams.get('scope')).toBe(
      `${googleSlidesScopes.presentationsReadonly} ${googleSlidesScopes.userInfoEmail}`
    );
  });

  it('maps callback and refresh token responses into the stored auth shape', async () => {
    let client = await loadProviderClient();

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: `${googleSlidesScopes.presentations} ${googleSlidesScopes.userInfoEmail}`
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
      scopes: [googleSlidesScopes.presentations]
    });

    expect(oauthPost).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.any(String),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    );

    expect(callbackResult.scopes).toEqual([
      googleSlidesScopes.presentations,
      googleSlidesScopes.userInfoEmail
    ]);

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
      scopes: [googleSlidesScopes.presentations]
    });
  });

  it('returns the existing output when refreshing without a refresh token', async () => {
    let client = await loadProviderClient();

    let result = await client.refreshToken({
      authenticationMethodId: 'google_oauth',
      output: {
        token: 'only-access'
      },
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleSlidesScopes.presentations]
    });

    expect(oauthPost).not.toHaveBeenCalled();
    expect(result.output).toEqual({ token: 'only-access' });
  });

  it('maps the Google profile payload into the Slate profile shape', async () => {
    let client = await loadProviderClient();

    profileGet.mockResolvedValueOnce({
      data: {
        id: 'user-123',
        email: 'slides-test@example.com',
        name: 'Slides Test User',
        picture: 'https://example.com/avatar.png'
      }
    });

    let result = await client.getAuthProfile({
      authenticationMethodId: 'google_oauth',
      output: {
        token: 'profile-token'
      },
      input: {},
      scopes: [googleSlidesScopes.userInfoProfile]
    });

    expect(profileGet).toHaveBeenCalledWith('/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer profile-token' }
    });
    expect(result.profile).toEqual({
      id: 'user-123',
      email: 'slides-test@example.com',
      name: 'Slides Test User',
      imageUrl: 'https://example.com/avatar.png'
    });
  });
});
