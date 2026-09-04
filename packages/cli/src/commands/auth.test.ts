import { describe, expect, it } from 'vitest';
import {
  assertOAuthProfileContinuity,
  completeIncrementalOAuthAuthorization,
  mergeIncrementalOAuthAuthorization,
  normalizeCallbackRedirectUriForIntegration,
  resolveIncrementalOAuthCredentials,
  validateIncrementalOAuthSetup
} from './auth';

let existingOAuthAuth = {
  id: 'auth-1',
  authMethodId: 'google_oauth',
  authMethodName: 'Google OAuth',
  authType: 'auth.oauth' as const,
  input: {},
  output: { token: 'access-token', refreshToken: 'refresh-token' },
  scopes: ['openid'],
  clientId: 'client-id',
  clientSecret: 'client-secret',
  profile: { id: 'google-user-1', email: 'person@example.com' },
  createdAt: '2026-09-02T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z'
};

describe('validateIncrementalOAuthSetup', () => {
  it('requires existing OAuth authentication', () => {
    expect(() =>
      validateIncrementalOAuthSetup({
        enabled: true,
        authMethodName: 'Google OAuth',
        previousAuth: null,
        scopes: ['scope:one']
      })
    ).toThrow('requires existing OAuth authentication');
  });

  it('requires an explicit scope batch', () => {
    expect(() =>
      validateIncrementalOAuthSetup({
        enabled: true,
        authMethodName: 'Google OAuth',
        previousAuth: existingOAuthAuth,
        scopes: []
      })
    ).toThrow('requires an explicit comma-separated scope batch');
  });

  it('returns the existing OAuth authentication for an incremental batch', () => {
    expect(
      validateIncrementalOAuthSetup({
        enabled: true,
        authMethodName: 'Google OAuth',
        previousAuth: existingOAuthAuth,
        scopes: ['scope:one']
      })
    ).toBe(existingOAuthAuth);
  });

  it('rejects input overrides so the existing auth input is preserved', () => {
    expect(() =>
      validateIncrementalOAuthSetup({
        enabled: true,
        authMethodName: 'Google OAuth',
        previousAuth: existingOAuthAuth,
        scopes: ['scope:one'],
        inputProvided: true
      })
    ).toThrow('reuses the existing authentication input');
  });
});

describe('mergeIncrementalOAuthAuthorization', () => {
  it('accumulates granted scopes and preserves an omitted refresh token', () => {
    expect(
      mergeIncrementalOAuthAuthorization({
        previousOutput: {
          token: 'old-access-token',
          refreshToken: 'existing-refresh-token',
          developerToken: 'developer-token'
        },
        previousScopes: ['openid', 'scope:one'],
        output: {
          token: 'new-access-token',
          refreshToken: undefined,
          developerToken: 'developer-token',
          expiresAt: '2026-09-02T12:00:00.000Z'
        },
        scopes: ['scope:one', 'scope:two']
      })
    ).toEqual({
      output: {
        token: 'new-access-token',
        refreshToken: 'existing-refresh-token',
        developerToken: 'developer-token',
        expiresAt: '2026-09-02T12:00:00.000Z'
      },
      scopes: ['openid', 'scope:one', 'scope:two']
    });
  });

  it('uses a replacement refresh token when the provider returns one', () => {
    expect(
      mergeIncrementalOAuthAuthorization({
        previousOutput: {
          token: 'old-access-token',
          refreshToken: 'old-refresh-token'
        },
        previousScopes: ['scope:one'],
        output: {
          token: 'new-access-token',
          refreshToken: 'new-refresh-token'
        },
        scopes: ['scope:two']
      }).output.refreshToken
    ).toBe('new-refresh-token');
  });
});

describe('resolveIncrementalOAuthCredentials', () => {
  let linkedCredential = {
    id: 'credential-1',
    name: 'Google credentials',
    authMethodId: 'google_oauth',
    clientId: 'client-id',
    clientSecret: 'credential-secret',
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z'
  };

  it('derives the prior client identity from its linked OAuth credential', () => {
    expect(
      resolveIncrementalOAuthCredentials({
        previousAuth: { ...existingOAuthAuth, clientId: undefined, clientSecret: undefined },
        linkedCredential
      })
    ).toEqual({
      credential: linkedCredential,
      clientId: 'client-id',
      clientSecret: 'credential-secret'
    });
  });

  it('rejects a selected credential for a different client', () => {
    expect(() =>
      resolveIncrementalOAuthCredentials({
        previousAuth: existingOAuthAuth,
        linkedCredential: null,
        selectedCredential: { ...linkedCredential, clientId: 'different-client-id' },
        selectedCredentialRequested: true
      })
    ).toThrow('must use the same OAuth client ID');
  });

  it('rejects setup when the prior client identity is unavailable', () => {
    expect(() =>
      resolveIncrementalOAuthCredentials({
        previousAuth: { ...existingOAuthAuth, clientId: undefined },
        linkedCredential: null
      })
    ).toThrow('cannot determine the OAuth client ID');
  });
});

describe('completeIncrementalOAuthAuthorization', () => {
  it('checks account continuity before merging a partial grant', () => {
    expect(
      completeIncrementalOAuthAuthorization({
        previousAuth: existingOAuthAuth,
        output: {
          token: 'new-access-token',
          refreshToken: undefined,
          developerToken: 'developer-token'
        },
        grantedScopes: ['scope:two'],
        profile: { id: 'google-user-1', email: 'renamed@example.com' }
      })
    ).toEqual({
      output: {
        token: 'new-access-token',
        refreshToken: 'refresh-token',
        developerToken: 'developer-token'
      },
      scopes: ['openid', 'scope:two']
    });
  });

  it('rejects a different account', () => {
    expect(() =>
      completeIncrementalOAuthAuthorization({
        previousAuth: existingOAuthAuth,
        output: { token: 'new-access-token' },
        grantedScopes: ['scope:two'],
        profile: { id: 'google-user-2', email: 'other@example.com' }
      })
    ).toThrow('returned a different Google account');
  });

  it('compares normalized email when the previous profile has no stable ID', () => {
    expect(() =>
      assertOAuthProfileContinuity(
        { email: 'Person@Example.com' },
        { email: 'person@example.com' }
      )
    ).not.toThrow();
  });
});

describe('normalizeCallbackRedirectUriForIntegration', () => {
  it('normalizes Notion loopback redirects to localhost', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration('notion', 'http://127.0.0.1:45873/callback')
    ).toBe('http://localhost:45873/callback');
  });

  it('normalizes Intercom loopback redirects to localhost', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration('intercom', 'http://127.0.0.1:45873/callback')
    ).toBe('http://localhost:45873/callback');
  });

  it('normalizes QuickBooks loopback redirects to localhost', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration(
        'quickbooks',
        'http://127.0.0.1:45873/callback'
      )
    ).toBe('http://localhost:45873/callback');
  });

  it('normalizes Typeform loopback redirects to localhost', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration('typeform', 'http://127.0.0.1:45873/callback')
    ).toBe('http://localhost:45873/callback');
  });

  it('normalizes Xero loopback redirects to localhost', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration('xero', 'http://127.0.0.1:45873/callback')
    ).toBe('http://localhost:45873/callback');
  });

  it('normalizes Zendesk loopback redirects to localhost', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration('zendesk', 'http://127.0.0.1:45873/callback')
    ).toBe('http://localhost:45873/callback');
  });

  it('leaves unrelated integration redirects unchanged', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration('attio', 'http://127.0.0.1:45873/callback')
    ).toBe('http://127.0.0.1:45873/callback');
  });

  it('normalizes HubSpot developer platform OAuth redirects to localhost', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration(
        'hubspot',
        'http://127.0.0.1:45873/callback',
        'developer_platform_oauth'
      )
    ).toBe('http://localhost:45873/callback');
  });

  it('leaves HubSpot legacy OAuth redirects unchanged', () => {
    expect(
      normalizeCallbackRedirectUriForIntegration(
        'hubspot',
        'http://127.0.0.1:45873/callback',
        'oauth'
      )
    ).toBe('http://127.0.0.1:45873/callback');
  });
});
