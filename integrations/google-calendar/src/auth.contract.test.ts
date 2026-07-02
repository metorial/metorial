import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleCalendarScopes } from './scopes';

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

describe('google-calendar auth contract', () => {
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
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.com/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('scope')).toBe(
      'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email'
    );
  });

  it('maps callback and refresh token responses into the stored auth shape', async () => {
    let client = await loadProviderClient();

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: `${googleCalendarScopes.calendar} ${googleCalendarScopes.userInfoEmail}`
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
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    expect(oauthPost).toHaveBeenCalledTimes(1);
    expect(oauthPost).toHaveBeenCalledWith(
      '/token',
      expect.any(String),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    );

    let callbackBody = new URLSearchParams(oauthPost.mock.calls[0]![1]);
    expect(callbackBody.get('code')).toBe('auth-code');
    expect(callbackBody.get('client_id')).toBe('client-id');
    expect(callbackBody.get('client_secret')).toBe('client-secret');
    expect(callbackBody.get('redirect_uri')).toBe('https://example.com/callback');
    expect(callbackBody.get('grant_type')).toBe('authorization_code');

    expect(callbackResult.output).toMatchObject({
      token: 'access-token',
      refreshToken: 'refresh-token'
    });
    expect(callbackResult.scopes).toEqual([
      googleCalendarScopes.calendar,
      googleCalendarScopes.userInfoEmail
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
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    let refreshBody = new URLSearchParams(oauthPost.mock.calls[1]![1]);
    expect(refreshBody.get('refresh_token')).toBe('refresh-token');
    expect(refreshBody.get('grant_type')).toBe('refresh_token');
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
          authenticationMethodId: 'oauth',
          output: {
            token: 'stale-token'
          },
          input: {},
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scopes: ['https://www.googleapis.com/auth/calendar']
        }),
      { code: 'internal.unexpected', kind: 'internal', status: 500 }
    );
  });

  it('maps the Google profile payload into the Slate profile shape', async () => {
    let client = await loadProviderClient();

    profileGet.mockResolvedValueOnce({
      data: {
        id: 'user-123',
        email: 'calendar-test@example.com',
        name: 'Calendar Test User',
        picture: 'https://example.com/avatar.png'
      }
    });

    let result = await client.getAuthProfile({
      authenticationMethodId: 'oauth',
      output: {
        token: 'profile-token'
      },
      input: {},
      scopes: ['https://www.googleapis.com/auth/userinfo.profile']
    });

    expect(profileGet).toHaveBeenCalledWith('/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer profile-token' }
    });
    expect(result.profile).toEqual({
      id: 'user-123',
      email: 'calendar-test@example.com',
      name: 'Calendar Test User',
      imageUrl: 'https://example.com/avatar.png'
    });
  });
});
