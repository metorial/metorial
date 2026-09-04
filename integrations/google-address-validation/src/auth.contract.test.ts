import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleAddressValidationScopes } from './scopes';

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

describe('google-address-validation auth contract', () => {
  it('marks API-key auth output so source handlers retain query-based authentication', async () => {
    let client = await loadProviderClient();

    let result = await client.getAuthOutput({
      authenticationMethodId: 'api_key',
      input: { apiKey: 'maps-api-key' }
    });

    expect(result.output).toEqual({
      token: 'maps-api-key',
      authMethod: 'api_key'
    });
  });

  it('builds the expected OAuth authorization URL', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      authenticationMethodId: 'oauth',
      redirectUri: 'https://example.com/callback',
      state: 'state-123',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleAddressValidationScopes.cloudPlatform]
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(url.searchParams.get('scope')).toBe(googleAddressValidationScopes.cloudPlatform);
  });

  it('maps callback and refresh token responses into the stored auth shape', async () => {
    let client = await loadProviderClient();

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: googleAddressValidationScopes.cloudPlatform
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
      scopes: [googleAddressValidationScopes.cloudPlatform]
    });

    expect(callbackResult.scopes).toEqual([googleAddressValidationScopes.cloudPlatform]);
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

    let refreshResult = await client.refreshToken({
      authenticationMethodId: 'oauth',
      output: {
        token: 'stale-token',
        authMethod: 'oauth',
        refreshToken: 'refresh-token'
      },
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleAddressValidationScopes.cloudPlatform]
    });

    expect(refreshResult.output).toMatchObject({
      token: 'refreshed-token',
      authMethod: 'oauth',
      refreshToken: 'refresh-token'
    });
  });

  it('fails refreshes cleanly when no refresh token is stored', async () => {
    let client = await loadProviderClient();

    oauthPost.mockClear();

    await expectSlateError(
      () =>
        client.refreshToken({
          authenticationMethodId: 'oauth',
          output: {
            token: 'stale-token',
            authMethod: 'oauth'
          },
          input: {},
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scopes: [googleAddressValidationScopes.cloudPlatform]
        }),
      {
        code: 'request.bad',
        kind: 'request',
        status: 400,
        baggage: {
          serviceError: {
            reason: 'google_address_validation_refresh_token_missing'
          }
        }
      }
    );

    expect(oauthPost).not.toHaveBeenCalled();
  });
});
