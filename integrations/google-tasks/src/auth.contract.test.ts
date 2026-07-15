import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleTasksScopes } from './scopes';

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
      createAxios: vi.fn(() => ({
        post: oauthPost,
        get: profileGet
      }))
    };
  });

  let { provider } = await import('./index');
  return createLocalSlateTestClient({ slate: provider });
};

afterEach(() => {
  vi.doUnmock('slates');
  vi.resetModules();
});

describe('google-tasks auth contract', () => {
  it('builds the expected OAuth authorization URL', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      authenticationMethodId: 'oauth',
      redirectUri: 'https://example.com/callback',
      state: 'state-123',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleTasksScopes.tasksReadonly]
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(url.searchParams.get('scope')).toBe(googleTasksScopes.tasksReadonly);
  });

  it('maps callback and refresh token responses into the stored auth shape', async () => {
    let client = await loadProviderClient();

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: `${googleTasksScopes.tasks} ${googleTasksScopes.tasksReadonly}`
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
      scopes: [googleTasksScopes.tasks]
    });

    expect(oauthPost).toHaveBeenCalledWith(
      '/token',
      new URLSearchParams({
        code: 'auth-code',
        client_id: 'client-id',
        client_secret: 'client-secret',
        redirect_uri: 'https://example.com/callback',
        grant_type: 'authorization_code'
      }).toString(),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    );

    expect(callbackResult.scopes).toEqual([
      googleTasksScopes.tasks,
      googleTasksScopes.tasksReadonly
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
      authenticationMethodId: 'oauth',
      output: {
        token: 'stale-token',
        refreshToken: 'refresh-token'
      },
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleTasksScopes.tasks]
    });
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
          scopes: [googleTasksScopes.tasks]
        }),
      { code: 'internal.unexpected', kind: 'internal', status: 500 }
    );
  });

  it('maps the Google profile payload into the Slate profile shape', async () => {
    let client = await loadProviderClient();

    profileGet.mockResolvedValueOnce({
      data: {
        id: 'user-123',
        email: 'tasks-test@example.com',
        name: 'Tasks Test User',
        picture: 'https://example.com/avatar.png'
      }
    });

    let result = await client.getAuthProfile({
      authenticationMethodId: 'oauth',
      output: {
        token: 'profile-token'
      },
      input: {},
      scopes: [googleTasksScopes.userinfoProfile]
    });

    expect(profileGet).toHaveBeenCalledWith('/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer profile-token' }
    });
    expect(result.profile).toEqual({
      id: 'user-123',
      email: 'tasks-test@example.com',
      name: 'Tasks Test User',
      imageUrl: 'https://example.com/avatar.png'
    });
  });

  it('returns an empty profile when userinfo scopes are not granted', async () => {
    let client = await loadProviderClient();

    let result = await client.getAuthProfile({
      authenticationMethodId: 'oauth',
      output: {
        token: 'profile-token'
      },
      input: {},
      scopes: [googleTasksScopes.tasks]
    });

    expect(profileGet).not.toHaveBeenCalled();
    expect(result.profile).toEqual({});
  });
});
