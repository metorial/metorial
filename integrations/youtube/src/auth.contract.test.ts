import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { youtubeScopes } from './scopes';

let oauthPost = vi.fn();
let profileGet = vi.fn();

let loadProviderClient = async () => {
  vi.resetModules();
  oauthPost.mockReset();
  profileGet.mockReset();

  vi.doMock('@slates/provider', async () => {
    let actual = await vi.importActual<typeof import('@slates/provider')>('@slates/provider');

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
  return createLocalSlateTestClient({ slate: provider as any });
};

afterEach(() => {
  vi.doUnmock('@slates/provider');
  vi.resetModules();
});

describe('youtube auth contract', () => {
  it('builds the expected OAuth authorization URL', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      authenticationMethodId: 'oauth2',
      redirectUri: 'https://example.com/callback',
      state: 'state-123',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [youtubeScopes.youtubeReadonly, youtubeScopes.youtubeUpload]
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(url.searchParams.get('scope')).toBe(
      `${youtubeScopes.youtubeReadonly} ${youtubeScopes.youtubeUpload}`
    );
  });

  it('maps callback and refresh token responses into the stored auth shape', async () => {
    let client = await loadProviderClient();

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: `${youtubeScopes.youtube} ${youtubeScopes.youtubeForceSsl}`
      }
    });

    let callbackResult = await client.handleAuthorizationCallback({
      authenticationMethodId: 'oauth2',
      code: 'auth-code',
      state: 'state-123',
      redirectUri: 'https://example.com/callback',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [youtubeScopes.youtubeReadonly]
    });

    expect(callbackResult.scopes).toEqual([
      youtubeScopes.youtube,
      youtubeScopes.youtubeForceSsl
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

    let refreshResult = await client.refreshToken({
      authenticationMethodId: 'oauth2',
      output: {
        token: 'stale-token',
        refreshToken: 'refresh-token'
      },
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [youtubeScopes.youtubeReadonly]
    });

    expect(refreshResult.output.token).toBe('refreshed-token');
  });

  it('fails refreshes cleanly when no refresh token is stored', async () => {
    let client = await loadProviderClient();

    await expectSlateError(
      () =>
        client.refreshToken({
          authenticationMethodId: 'oauth2',
          output: { token: 'stale-token' },
          input: {},
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scopes: [youtubeScopes.youtubeReadonly]
        }),
      { code: 'request.bad', status: 400 }
    );
  });

  it('maps the Google profile payload into the Slate profile shape', async () => {
    let client = await loadProviderClient();

    profileGet.mockResolvedValueOnce({
      data: {
        id: 'user-123',
        email: 'yt-test@example.com',
        name: 'YouTube Test User',
        picture: 'https://example.com/avatar.png'
      }
    });

    let result = await client.getAuthProfile({
      authenticationMethodId: 'oauth2',
      output: { token: 'profile-token' },
      input: {},
      scopes: ['https://www.googleapis.com/auth/userinfo.profile']
    });

    expect(profileGet).toHaveBeenCalledWith('/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer profile-token' }
    });
    expect(result.profile).toMatchObject({
      id: 'user-123',
      email: 'yt-test@example.com',
      name: 'YouTube Test User',
      imageUrl: 'https://example.com/avatar.png'
    });
  });
});
