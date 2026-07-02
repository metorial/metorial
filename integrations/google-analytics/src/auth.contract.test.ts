import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleAnalyticsScopes } from './scopes';

let fetchMock = vi.fn();

let googleResponse = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    ...init
  });

let loadProviderClient = async () => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);

  let { provider } = await import('./index');
  return createLocalSlateTestClient({ slate: provider });
};

type OAuthCallbackMethod = {
  key: string;
  handleCallback: (ctx: {
    code: string;
    state: string;
    redirectUri: string;
    input: Record<string, unknown>;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    callbackParams: Record<string, string>;
    callbackState: Record<string, unknown>;
  }) => Promise<{
    output: Record<string, unknown>;
    input?: Record<string, unknown>;
    scopes?: string[];
  }>;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('google-analytics auth contract', () => {
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
        googleAnalyticsScopes.analyticsReadonly,
        googleAnalyticsScopes.openIdEmailProfile
      ]
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(url.searchParams.get('scope')).toBe(
      `${googleAnalyticsScopes.analyticsReadonly} ${googleAnalyticsScopes.openIdEmailProfile}`
    );
    expect(result.input).toEqual({});
  });

  it('handles OAuth callback token exchange without a Slate invocation context', async () => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce(
      googleResponse({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: googleAnalyticsScopes.analyticsReadonly
      })
    );

    let { auth } = await import('./auth');
    let oauthMethod = auth.authStack.find(
      method => method.key === 'oauth' && 'handleCallback' in method
    );

    if (!oauthMethod || !('handleCallback' in oauthMethod)) {
      throw new Error('Google Analytics OAuth method was not found.');
    }

    let result = await (oauthMethod as unknown as OAuthCallbackMethod).handleCallback({
      code: 'auth-code',
      state: 'state-123',
      redirectUri: 'http://127.0.0.1:45873/callback',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleAnalyticsScopes.analyticsReadonly],
      callbackParams: {},
      callbackState: {}
    });

    expect(result.output).toMatchObject({
      token: 'access-token',
      refreshToken: 'refresh-token'
    });
  });

  it('maps callback and refresh token responses into the stored OAuth auth shape', async () => {
    let client = await loadProviderClient();

    fetchMock
      .mockResolvedValueOnce(
        googleResponse({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
          scope: `${googleAnalyticsScopes.analyticsEdit} ${googleAnalyticsScopes.openIdEmailProfile}`
        })
      )
      .mockResolvedValueOnce(
        googleResponse({
          access_token: 'refreshed-token',
          expires_in: 1800
        })
      );

    let callbackResult = await client.handleAuthorizationCallback({
      authenticationMethodId: 'oauth',
      code: 'auth-code',
      state: 'state-123',
      redirectUri: 'https://example.com/callback',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleAnalyticsScopes.analyticsEdit]
    });

    expect(callbackResult.output).toMatchObject({
      token: 'access-token',
      refreshToken: 'refresh-token'
    });
    expect(callbackResult.output.measurementId).toBeUndefined();
    expect(callbackResult.output.apiSecret).toBeUndefined();
    expect(callbackResult.scopes).toEqual([
      googleAnalyticsScopes.analyticsEdit,
      'openid',
      'email',
      'profile'
    ]);
    expect(Date.parse(String(callbackResult.output.expiresAt))).toBeGreaterThan(Date.now());

    // Preserve legacy/Measurement Protocol credentials if an existing OAuth profile has them.
    let refreshResult = await client.refreshToken({
      authenticationMethodId: 'oauth',
      output: {
        token: 'stale-token',
        refreshToken: 'refresh-token',
        measurementId: 'G-X',
        apiSecret: 's'
      },
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleAnalyticsScopes.analyticsEdit]
    });

    expect(refreshResult.output).toMatchObject({
      token: 'refreshed-token',
      refreshToken: 'refresh-token',
      measurementId: 'G-X',
      apiSecret: 's'
    });
    expect(Date.parse(String(refreshResult.output.expiresAt))).toBeGreaterThan(Date.now());
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('maps Measurement Protocol Only auth input into the stored auth shape', async () => {
    let client = await loadProviderClient();

    let result = await client.getAuthOutput({
      authenticationMethodId: 'measurement_protocol',
      input: {
        measurementId: 'G-TEST123',
        apiSecret: 'secret'
      }
    });

    expect(result.output).toEqual({
      token: '',
      measurementId: 'G-TEST123',
      apiSecret: 'secret'
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
          scopes: [googleAnalyticsScopes.analyticsReadonly]
        }),
      { code: 'request.bad', kind: 'request', status: 400 }
    );
  });

  it('maps the Google profile payload into the Slate profile shape', async () => {
    let client = await loadProviderClient();

    fetchMock.mockResolvedValueOnce(
      googleResponse({
        id: 'user-123',
        email: 'ga-test@example.com',
        name: 'GA Test User',
        picture: 'https://example.com/avatar.png'
      })
    );

    let result = await client.getAuthProfile({
      authenticationMethodId: 'oauth',
      output: {
        token: 'profile-token'
      },
      input: {},
      scopes: [googleAnalyticsScopes.openIdEmailProfile]
    });

    expect(result.profile).toEqual({
      id: 'user-123',
      email: 'ga-test@example.com',
      name: 'GA Test User',
      imageUrl: 'https://example.com/avatar.png'
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      expect.objectContaining({
        method: 'GET',
        headers: {
          Authorization: 'Bearer profile-token'
        }
      })
    );
  });
});
