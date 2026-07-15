import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleChatScopes } from './scopes';

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

describe('google-chat auth contract', () => {
  it('builds the authorization URL with offline consent and requested scopes', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthorizationUrl({
      authenticationMethodId: 'oauth',
      redirectUri: 'https://example.com/callback',
      state: 'state-123',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleChatScopes.messages, googleChatScopes.userInfoEmail]
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    expect(url.searchParams.get('scope')).toBe(
      `${googleChatScopes.messages} ${googleChatScopes.userInfoEmail}`
    );
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('include_granted_scopes')).toBe('true');
    expect(url.searchParams.get('prompt')).toBe('consent');
  });

  it('normalizes callback tokens and preserves the refresh token on refresh', async () => {
    let client = await loadProviderClient();
    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        scope: `${googleChatScopes.messages} ${googleChatScopes.spacesReadonly}`
      }
    });

    let callback = await client.handleAuthorizationCallback({
      authenticationMethodId: 'oauth',
      code: 'auth-code',
      state: 'state-123',
      redirectUri: 'https://example.com/callback',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleChatScopes.messages]
    });

    expect(callback.scopes).toEqual([
      googleChatScopes.messages,
      googleChatScopes.spacesReadonly
    ]);
    expect(callback.output).toMatchObject({
      token: 'access-token',
      refreshToken: 'refresh-token'
    });
    expect(callback.output.expiresAt).toEqual(expect.any(String));

    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'refreshed-token',
        expires_in: 1800
      }
    });

    let refreshed = await client.refreshToken({
      authenticationMethodId: 'oauth',
      output: {
        token: 'stale-token',
        refreshToken: 'refresh-token'
      },
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [googleChatScopes.messages]
    });

    expect(refreshed.output).toMatchObject({
      token: 'refreshed-token',
      refreshToken: 'refresh-token'
    });
  });

  it('returns an actionable ServiceError when no refresh token is stored', async () => {
    let client = await loadProviderClient();

    await expectSlateError(
      () =>
        client.refreshToken({
          authenticationMethodId: 'oauth',
          output: { token: 'stale-token' },
          input: {},
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scopes: [googleChatScopes.messages]
        }),
      {
        code: 'request.bad',
        kind: 'request',
        status: 400,
        baggage: {
          serviceError: {
            reason: 'google_chat_missing_refresh_token'
          }
        }
      }
    );
  });

  it('maps Google userinfo into the Slate connection profile', async () => {
    let client = await loadProviderClient();
    profileGet.mockResolvedValueOnce({
      data: {
        id: 'user-123',
        email: 'chat-user@example.com',
        name: 'Chat User',
        picture: 'https://example.com/avatar.png'
      }
    });

    let result = await client.getAuthProfile({
      authenticationMethodId: 'oauth',
      output: { token: 'profile-token' },
      input: {},
      scopes: [googleChatScopes.userInfoProfile, googleChatScopes.userInfoEmail]
    });

    expect(result.profile).toEqual({
      id: 'user-123',
      email: 'chat-user@example.com',
      name: 'Chat User',
      imageUrl: 'https://example.com/avatar.png'
    });
  });

  it('does not call userinfo when identity scopes were not granted', async () => {
    let client = await loadProviderClient();
    let result = await client.getAuthProfile({
      authenticationMethodId: 'oauth',
      output: { token: 'profile-token' },
      input: {},
      scopes: [googleChatScopes.messages]
    });

    expect(result.profile).toEqual({});
    expect(profileGet).not.toHaveBeenCalled();
  });

  it('signs and refreshes a chat.bot service-account token', async () => {
    let client = await loadProviderClient();
    let privateKey = await createPrivateKeyPem();
    let serviceAccountJson = JSON.stringify({
      client_email: 'chat-app@example.iam.gserviceaccount.com',
      client_id: 'chat-app-123',
      project_id: 'chat-app-project',
      private_key: privateKey
    });
    oauthPost.mockResolvedValueOnce({
      data: { access_token: 'service-account-token', expires_in: 3600 }
    });

    let result = await client.getAuthOutput({
      authenticationMethodId: 'service_account',
      input: { serviceAccountJson }
    });

    expect(result.output.token).toBe('service-account-token');
    expect(result.scopes).toEqual([googleChatScopes.bot]);
    let body = new URLSearchParams(String(oauthPost.mock.calls[0]?.[1]));
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    let assertion = body.get('assertion');
    expect(assertion?.split('.')).toHaveLength(3);
    let payload = JSON.parse(
      Buffer.from(assertion?.split('.')[1] ?? '', 'base64url').toString('utf8')
    );
    expect(payload).toMatchObject({
      iss: 'chat-app@example.iam.gserviceaccount.com',
      scope: googleChatScopes.bot,
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
      id: 'chat-app-123',
      email: 'chat-app@example.iam.gserviceaccount.com',
      name: 'chat-app-project'
    });

    oauthPost.mockResolvedValueOnce({
      data: { access_token: 'refreshed-service-account-token', expires_in: 3600 }
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
  });

  it('returns a ServiceError for invalid service-account JSON', async () => {
    let client = await loadProviderClient();

    await expectSlateError(
      () =>
        client.getAuthOutput({
          authenticationMethodId: 'service_account',
          input: { serviceAccountJson: 'not-json' }
        }),
      {
        baggage: {
          serviceError: {
            reason: 'google_chat_service_account_auth_error'
          }
        }
      }
    );
    expect(oauthPost).not.toHaveBeenCalled();
  });
});
