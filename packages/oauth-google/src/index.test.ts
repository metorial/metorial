import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createGoogleOAuth, type GoogleOAuthDependencies } from './index';

let scopes = [
  { title: 'Mail', description: 'Read mail.', scope: 'scope:mail' },
  { title: 'Profile', scope: 'scope:profile' }
];

let createDependencies = (
  overrides: Partial<GoogleOAuthDependencies> = {}
): GoogleOAuthDependencies => ({
  requestToken: vi.fn(async () => ({
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    scope: 'scope:mail scope:profile'
  })),
  getUserInfo: vi.fn(async () => ({
    id: 'user-1',
    email: 'person@example.com',
    name: 'Person Example',
    picture: 'https://example.com/person.png'
  })),
  now: () => 1_000,
  ...overrides
});

describe('@slates/oauth-google', () => {
  it('preserves consumer-owned descriptors and requests exactly the supplied scopes', async () => {
    let oauth = createGoogleOAuth({ scopes, dependencies: createDependencies() });
    let requestedScopes = scopes.map(scope => scope.scope);
    let { url } = await oauth.getAuthorizationUrl({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://example.com/callback',
      scopes: requestedScopes,
      state: 'state'
    });
    let parsed = new URL(url);

    expect(oauth.scopes).toEqual(scopes);
    expect(parsed.searchParams.get('scope')).toBe('scope:mail scope:profile');
    expect(parsed.searchParams.get('access_type')).toBe('offline');
    expect(parsed.searchParams.get('include_granted_scopes')).toBe('true');
    expect(parsed.searchParams.get('prompt')).toBe('consent');
    expect(parsed.searchParams.get('state')).toBe('state');
  });

  it("normalizes callback output and returns Google's granted scopes", async () => {
    let dependencies = createDependencies();
    let oauth = createGoogleOAuth({ scopes, dependencies });
    let result = await oauth.handleCallback({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://example.com/callback',
      scopes: scopes.map(scope => scope.scope),
      code: 'authorization-code'
    });

    expect(dependencies.requestToken).toHaveBeenCalledWith({
      code: 'authorization-code',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://example.com/callback',
      grantType: 'authorization_code'
    });
    expect(result).toEqual({
      output: {
        token: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: '1970-01-01T01:00:01.000Z',
        authMethod: 'oauth'
      },
      scopes: ['scope:mail', 'scope:profile']
    });
  });

  it('falls back to the requested scopes when Google omits granted scopes', async () => {
    let oauth = createGoogleOAuth({
      scopes,
      dependencies: createDependencies({
        requestToken: async () => ({ access_token: 'access-token' })
      })
    });

    let result = await oauth.handleCallback({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://example.com/callback',
      scopes: ['scope:mail'],
      code: 'authorization-code'
    });

    expect(result.scopes).toEqual(['scope:mail']);
  });

  it('preserves an existing refresh token when Google omits its replacement', async () => {
    let dependencies = createDependencies({
      requestToken: vi.fn(async () => ({
        access_token: 'refreshed-access-token',
        expires_in: 60
      }))
    });
    let oauth = createGoogleOAuth({ scopes, dependencies });
    let result = await oauth.handleTokenRefresh({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: ['scope:mail'],
      output: {
        token: 'old-access-token',
        refreshToken: 'existing-refresh-token',
        authMethod: 'oauth'
      }
    });

    expect(dependencies.requestToken).toHaveBeenCalledWith({
      refreshToken: 'existing-refresh-token',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      grantType: 'refresh_token'
    });
    expect(result.output).toEqual({
      token: 'refreshed-access-token',
      refreshToken: 'existing-refresh-token',
      expiresAt: '1970-01-01T00:01:01.000Z',
      authMethod: 'oauth'
    });
  });

  it('throws ServiceError when no refresh token is stored', async () => {
    let oauth = createGoogleOAuth({ scopes, dependencies: createDependencies() });

    await expect(
      oauth.handleTokenRefresh({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        scopes: ['scope:mail'],
        output: { token: 'old-access-token', authMethod: 'oauth' }
      })
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('maps the Google userinfo response to a real profile', async () => {
    let dependencies = createDependencies();
    let oauth = createGoogleOAuth({ scopes, dependencies });

    await expect(
      oauth.getProfile({
        scopes: ['scope:profile'],
        output: { token: 'access-token', authMethod: 'oauth' }
      })
    ).resolves.toEqual({
      profile: {
        id: 'user-1',
        email: 'person@example.com',
        name: 'Person Example',
        imageUrl: 'https://example.com/person.png'
      }
    });
    expect(dependencies.getUserInfo).toHaveBeenCalledWith('access-token');
  });

  it('persists consumer-owned OAuth input through callback and refresh', async () => {
    let dependencies = createDependencies();
    let developerTokenSchema = z.object({ developerToken: z.string() });
    let oauth = createGoogleOAuth({
      scopes,
      dependencies,
      additionalInput: {
        schema: developerTokenSchema,
        mapToOutput: input => ({ developerToken: input.developerToken })
      }
    });
    let input = { developerToken: 'developer-token' };

    expect(oauth.inputSchema).toBe(developerTokenSchema);
    await expect(
      oauth.getAuthorizationUrl({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        redirectUri: 'https://example.com/callback',
        scopes: ['scope:mail'],
        state: 'state',
        input
      })
    ).resolves.toHaveProperty('input', input);

    let callback = await oauth.handleCallback({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://example.com/callback',
      scopes: ['scope:mail'],
      code: 'authorization-code',
      input
    });
    expect(callback.output.developerToken).toBe('developer-token');
    expect(callback.input).toBe(input);

    let refreshed = await oauth.handleTokenRefresh({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: ['scope:mail'],
      output: callback.output,
      input
    });
    expect(refreshed.output.developerToken).toBe('developer-token');
    expect(refreshed.input).toBe(input);
  });

  it('rejects duplicate scope descriptors with ServiceError', () => {
    expect(() =>
      createGoogleOAuth({
        scopes: [scopes[0]!, scopes[0]!],
        dependencies: createDependencies()
      })
    ).toThrowError(ServiceError);
  });
});
