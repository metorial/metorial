import { createLocalSlateTestClient } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeEngineScopes } from './scopes';

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
          return { post: oauthPost };
        }

        if (config?.baseURL === 'https://www.googleapis.com') {
          return { get: profileGet };
        }

        return actual.createAxios(config);
      })
    };
  });

  let { provider } = await import('./index');
  return createLocalSlateTestClient({ slate: provider });
};

let createPrivateKeyPem = async () => {
  let keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 1024,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  );
  if (!('privateKey' in keyPair)) throw new Error('Expected an asymmetric key pair');

  let pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  let encoded = Buffer.from(pkcs8)
    .toString('base64')
    .match(/.{1,64}/g)
    ?.join('\n');
  return `-----BEGIN PRIVATE KEY-----\n${encoded}\n-----END PRIVATE KEY-----\n`;
};

afterEach(() => {
  vi.doUnmock('slates');
  vi.resetModules();
});

describe('compute-engine auth contract', () => {
  it('builds the expected OAuth authorization URL', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      authenticationMethodId: 'google_oauth',
      redirectUri: 'https://example.com/callback',
      state: 'state-123',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [computeEngineScopes.compute]
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.com/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe(computeEngineScopes.compute);
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
  });

  it('maps callback, profile, and refresh responses into the auth contract', async () => {
    let client = await loadProviderClient();
    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: `${computeEngineScopes.compute} ${computeEngineScopes.userinfoProfile} ${computeEngineScopes.userinfoEmail}`
      }
    });

    let callback = await client.handleAuthorizationCallback({
      authenticationMethodId: 'google_oauth',
      code: 'auth-code',
      state: 'state-123',
      redirectUri: 'https://example.com/callback',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [computeEngineScopes.compute]
    });

    expect(callback.output).toMatchObject({
      token: 'access-token',
      refreshToken: 'refresh-token'
    });
    expect(callback.scopes).toEqual([
      computeEngineScopes.compute,
      computeEngineScopes.userinfoProfile,
      computeEngineScopes.userinfoEmail
    ]);
    expect(Date.parse(String(callback.output.expiresAt))).toBeGreaterThan(Date.now());
    expect(oauthPost).toHaveBeenLastCalledWith(
      '/token',
      expect.stringContaining('grant_type=authorization_code'),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    profileGet.mockResolvedValueOnce({
      data: {
        id: 'user-123',
        email: 'operator@example.com',
        name: 'Compute Operator',
        picture: 'https://example.com/avatar.png'
      }
    });
    let profile = await client.getAuthProfile({
      authenticationMethodId: 'google_oauth',
      output: callback.output,
      input: {},
      scopes: callback.scopes ?? []
    });
    expect(profile.profile).toEqual({
      id: 'user-123',
      email: 'operator@example.com',
      name: 'Compute Operator',
      imageUrl: 'https://example.com/avatar.png'
    });

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'refreshed-token',
        expires_in: 1800
      }
    });
    let refreshed = await client.refreshToken({
      authenticationMethodId: 'google_oauth',
      output: callback.output,
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: callback.scopes ?? []
    });
    expect(refreshed.output).toMatchObject({
      token: 'refreshed-token',
      refreshToken: 'refresh-token'
    });
  });

  it('signs and exchanges a service-account JWT assertion', async () => {
    let client = await loadProviderClient();
    let privateKey = await createPrivateKeyPem();
    let serviceAccountJson = JSON.stringify({
      client_email: 'compute-agent@example.iam.gserviceaccount.com',
      client_id: 'service-account-123',
      project_id: 'example-project',
      private_key: privateKey
    });
    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'service-account-token',
        expires_in: 3600
      }
    });

    let result = await client.getAuthOutput({
      authenticationMethodId: 'service_account',
      input: {
        serviceAccountJson
      }
    });

    expect(result.output.token).toBe('service-account-token');
    expect(result.scopes).toEqual([computeEngineScopes.compute]);
    let body = new URLSearchParams(String(oauthPost.mock.calls[0]?.[1]));
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    let assertion = body.get('assertion');
    expect(assertion?.split('.')).toHaveLength(3);
    let payload = JSON.parse(
      Buffer.from(assertion?.split('.')[1] ?? '', 'base64url').toString('utf8')
    );
    expect(payload).toMatchObject({
      iss: 'compute-agent@example.iam.gserviceaccount.com',
      scope: computeEngineScopes.compute,
      aud: 'https://oauth2.googleapis.com/token'
    });
    expect(payload.exp - payload.iat).toBe(3600);

    let profile = await client.getAuthProfile({
      authenticationMethodId: 'service_account',
      output: result.output,
      input: { serviceAccountJson },
      scopes: result.scopes ?? []
    });
    expect(profile.profile).toEqual({
      id: 'service-account-123',
      email: 'compute-agent@example.iam.gserviceaccount.com',
      name: 'example-project'
    });

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'refreshed-service-account-token',
        expires_in: 3600
      }
    });
    let refreshed = await client.refreshToken({
      authenticationMethodId: 'service_account',
      output: result.output,
      input: { serviceAccountJson },
      clientId: '',
      clientSecret: '',
      scopes: result.scopes ?? []
    });
    expect(refreshed.output.token).toBe('refreshed-service-account-token');
    expect(oauthPost).toHaveBeenCalledTimes(2);
  });

  it('returns a user-facing auth error for invalid service-account JSON', async () => {
    let client = await loadProviderClient();

    await expect(
      client.getAuthOutput({
        authenticationMethodId: 'service_account',
        input: { serviceAccountJson: 'not-json' }
      })
    ).rejects.toThrow('Service account JSON must be valid JSON.');
    expect(oauthPost).not.toHaveBeenCalled();
  });
});
