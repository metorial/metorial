import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleCloudVisionScopes } from './scopes';

let oauthPost = vi.fn();

let loadProviderClient = async () => {
  vi.resetModules();
  oauthPost.mockReset();

  vi.doMock('slates', async () => {
    let actual = await vi.importActual<typeof import('slates')>('slates');

    return {
      ...actual,
      createAxios: vi.fn(() => ({
        post: oauthPost
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

describe('google-cloud-vision auth contract', () => {
  it('builds the expected OAuth authorization URL', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      authenticationMethodId: 'google_oauth',
      redirectUri: 'https://example.com/callback',
      state: 'state-123',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleCloudVisionScopes.cloudVision, googleCloudVisionScopes.cloudPlatform]
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(url.searchParams.get('scope')).toBe(
      `${googleCloudVisionScopes.cloudVision} ${googleCloudVisionScopes.cloudPlatform}`
    );
  });

  it('maps callback and refresh token responses into the stored auth shape', async () => {
    let client = await loadProviderClient();

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: `${googleCloudVisionScopes.cloudVision} ${googleCloudVisionScopes.cloudPlatform}`
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
      scopes: [googleCloudVisionScopes.cloudVision]
    });

    expect(oauthPost).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({
        code: 'auth-code',
        grant_type: 'authorization_code'
      }),
      expect.any(Object)
    );

    expect(callbackResult.scopes).toEqual([
      googleCloudVisionScopes.cloudVision,
      googleCloudVisionScopes.cloudPlatform
    ]);
    expect(callbackResult.output).toMatchObject({
      token: 'access-token',
      authMethod: 'oauth',
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
        authMethod: 'oauth',
        refreshToken: 'refresh-token'
      },
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleCloudVisionScopes.cloudVision]
    });
  });

  it('fails refreshes cleanly when no refresh token is stored', async () => {
    let client = await loadProviderClient();

    await expectSlateError(
      () =>
        client.refreshToken({
          authenticationMethodId: 'google_oauth',
          output: {
            token: 'stale-token',
            authMethod: 'oauth'
          },
          input: {},
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scopes: [googleCloudVisionScopes.cloudVision]
        }),
      { code: 'internal.unexpected', kind: 'internal', status: 500 }
    );
  });
});
