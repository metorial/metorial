import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { youtubeAnalyticsScopes } from './scopes';

let oauthPost = vi.fn();
let channelsGet = vi.fn();

let loadProviderClient = async () => {
  vi.resetModules();
  oauthPost.mockReset();
  channelsGet.mockReset();

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

        if (config?.baseURL === 'https://www.googleapis.com/youtube/v3') {
          return {
            get: channelsGet
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

describe('youtube-analytics auth contract', () => {
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
        youtubeAnalyticsScopes.ytAnalyticsReadonly,
        youtubeAnalyticsScopes.youtubeReadonly
      ]
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(url.searchParams.get('scope')).toBe(
      `${youtubeAnalyticsScopes.ytAnalyticsReadonly} ${youtubeAnalyticsScopes.youtubeReadonly}`
    );
  });

  it('maps callback and refresh token responses into the stored auth shape', async () => {
    let client = await loadProviderClient();

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: `${youtubeAnalyticsScopes.ytAnalyticsReadonly} ${youtubeAnalyticsScopes.youtube}`
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
      scopes: [youtubeAnalyticsScopes.ytAnalyticsReadonly]
    });

    expect(callbackResult.scopes).toEqual([
      youtubeAnalyticsScopes.ytAnalyticsReadonly,
      youtubeAnalyticsScopes.youtube
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
      scopes: [youtubeAnalyticsScopes.ytAnalyticsReadonly]
    });

    expect(oauthPost).toHaveBeenCalledTimes(2);
  });

  it('fails refreshes cleanly when no refresh token is stored', async () => {
    let client = await loadProviderClient();

    await expectSlateError(
      () =>
        client.refreshToken({
          authenticationMethodId: 'google_oauth',
          output: { token: 'stale-token' },
          input: {},
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scopes: [youtubeAnalyticsScopes.ytAnalyticsReadonly]
        }),
      { code: 'internal.unexpected', kind: 'internal', status: 500 }
    );
  });

  it('maps the YouTube channel payload into the Slate profile shape', async () => {
    let client = await loadProviderClient();

    channelsGet.mockResolvedValueOnce({
      data: {
        items: [
          {
            id: 'channel-123',
            snippet: {
              title: 'Test Channel',
              thumbnails: {
                default: { url: 'https://example.com/thumb.png' }
              }
            }
          }
        ]
      }
    });

    let result = await client.getAuthProfile({
      authenticationMethodId: 'google_oauth',
      output: { token: 'profile-token' },
      input: {},
      scopes: [youtubeAnalyticsScopes.youtubeReadonly]
    });

    expect(channelsGet).toHaveBeenCalledWith('/channels', {
      params: {
        part: 'snippet,statistics',
        mine: true
      },
      headers: { Authorization: 'Bearer profile-token' }
    });
    expect(result.profile).toEqual({
      id: 'channel-123',
      name: 'Test Channel',
      imageUrl: 'https://example.com/thumb.png'
    });
  });
});
