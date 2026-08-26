import { ServiceError } from '@lowerdeck/error';
import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let authMocks = vi.hoisted(() => ({
  getRequestToken: vi.fn(),
  getAccessToken: vi.fn(),
  profileGet: vi.fn()
}));

vi.mock('./lib/oauth1', () => ({
  getTrelloRequestToken: authMocks.getRequestToken,
  getTrelloAccessToken: authMocks.getAccessToken
}));

vi.mock('slates', async () => {
  let actual = await vi.importActual<typeof import('slates')>('slates');

  return {
    ...actual,
    createAxios: vi.fn(() => ({ get: authMocks.profileGet }))
  };
});

import { auth } from './auth';
import { provider } from './index';

let createClient = () => createLocalSlateTestClient({ slate: provider });

let oauthContext = {
  authenticationMethodId: 'oauth1',
  redirectUri: 'https://example.com/callback',
  state: 'state-123',
  input: {},
  clientId: 'api-key',
  clientSecret: 'api-secret',
  scopes: ['read', 'write']
};

let validCallback = {
  ...oauthContext,
  code: 'verifier',
  callbackParams: { oauth_token: 'request-token' },
  callbackState: {
    oauthToken: 'request-token',
    oauthTokenSecret: 'request-secret'
  }
};

beforeEach(() => {
  authMocks.getRequestToken.mockReset();
  authMocks.getAccessToken.mockReset();
  authMocks.profileGet.mockReset();
  authMocks.getRequestToken.mockResolvedValue({
    oauthToken: 'request-token',
    oauthTokenSecret: 'request-secret'
  });
  authMocks.getAccessToken.mockResolvedValue({
    oauthToken: 'access-token',
    oauthTokenSecret: 'access-secret'
  });
});

describe('Trello auth contract', () => {
  it('registers OAuth before the existing manual auth method with read/write scopes', async () => {
    let result = await createClient().listAuthMethods();

    expect(
      result.authenticationMethods.map(method => ({
        id: method.id,
        type: method.type,
        name: method.name,
        scopes: method.scopes?.map(scope => scope.id)
      }))
    ).toEqual([
      {
        id: 'oauth1',
        type: 'auth.oauth',
        name: 'OAuth 1.0a',
        scopes: ['read', 'write']
      },
      {
        id: 'api_key_token',
        type: 'auth.token',
        name: 'API Key & Token',
        scopes: undefined
      }
    ]);

    let manualMethod = result.authenticationMethods[1]!;
    expect(manualMethod.inputSchema.properties.apiKey.description).toBe(
      'Trello API Key from https://trello.com/apps/admin'
    );
  });

  it.each([
    [['read', 'write'], 'read,write'],
    [['read'], 'read']
  ])('requests only the selected Trello scopes: %j', async (scopes, expectedScope) => {
    let result = await createClient().getAuthorizationUrl({
      ...oauthContext,
      scopes
    });

    expect(authMocks.getRequestToken).toHaveBeenCalledWith(
      'api-key',
      'api-secret',
      'https://example.com/callback?state=state-123'
    );
    expect(result.callbackState).toEqual({
      oauthToken: 'request-token',
      oauthTokenSecret: 'request-secret'
    });

    let url = new URL(result.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe('https://trello.com/1/OAuthAuthorizeToken');
    expect(url.searchParams.get('oauth_token')).toBe('request-token');
    expect(url.searchParams.get('scope')).toBe(expectedScope);
    expect(url.searchParams.get('expiration')).toBe('never');
    expect(url.searchParams.get('name')).toBe('Trello Integration');
  });

  it('replaces an existing redirect state with the current framework state', async () => {
    await createClient().getAuthorizationUrl({
      ...oauthContext,
      redirectUri: 'https://example.com/callback?source=test&state=stale-state'
    });

    let callbackUrl = new URL(authMocks.getRequestToken.mock.calls[0]![2]);
    expect(callbackUrl.searchParams.get('source')).toBe('test');
    expect(callbackUrl.searchParams.getAll('state')).toEqual(['state-123']);
  });

  it.each([
    {
      name: 'missing saved request token',
      context: {
        ...validCallback,
        callbackState: { oauthTokenSecret: 'request-secret' }
      }
    },
    {
      name: 'missing saved request token secret',
      context: {
        ...validCallback,
        callbackState: { oauthToken: 'request-token' }
      }
    },
    {
      name: 'missing callback token',
      context: { ...validCallback, callbackParams: {} }
    },
    {
      name: 'mismatched callback token',
      context: {
        ...validCallback,
        callbackParams: { oauth_token: 'different-token' }
      }
    },
    {
      name: 'missing verifier',
      context: { ...validCallback, code: ' ' }
    }
  ])('rejects $name with a Trello ServiceError before exchange', async ({ context }) => {
    let oauthMethod = auth.authStack[0];
    if (!oauthMethod || oauthMethod.type !== 'auth.oauth') {
      throw new TypeError('OAuth auth method is not registered first');
    }

    await expect(oauthMethod.handleCallback(context as any)).rejects.toBeInstanceOf(
      ServiceError
    );
    expect(authMocks.getAccessToken).not.toHaveBeenCalled();
  });

  it('correlates the callback, exchanges the verifier, and preserves selected scopes', async () => {
    let result = await createClient().handleAuthorizationCallback(validCallback);

    expect(authMocks.getAccessToken).toHaveBeenCalledWith(
      'api-key',
      'api-secret',
      'request-token',
      'request-secret',
      'verifier'
    );
    expect(result).toEqual({
      output: {
        apiKey: 'api-key',
        token: 'access-token'
      },
      scopes: ['read', 'write']
    });
  });

  it('uses the exchanged API key and token for the OAuth profile', async () => {
    let callbackResult = await createClient().handleAuthorizationCallback(validCallback);
    authMocks.profileGet.mockResolvedValueOnce({
      data: {
        id: 'member-1',
        fullName: 'Trello User',
        username: 'trello-user',
        avatarUrl: 'https://example.com/trello-avatar.png'
      }
    });

    let result = await createClient().getAuthProfile({
      authenticationMethodId: 'oauth1',
      output: callbackResult.output,
      input: {},
      scopes: callbackResult.scopes ?? []
    });

    expect(authMocks.profileGet).toHaveBeenCalledWith('/members/me', {
      params: {
        key: 'api-key',
        token: 'access-token',
        fields: 'id,fullName,username,email,avatarUrl'
      }
    });
    expect(result.profile).toEqual({
      id: 'member-1',
      name: 'Trello User',
      imageUrl: 'https://example.com/trello-avatar.png'
    });
    expect(result.profile).not.toHaveProperty('email');
  });

  it('preserves the existing manual output and profile behavior', async () => {
    let client = createClient();
    let output = await client.getAuthOutput({
      authenticationMethodId: 'api_key_token',
      input: {
        apiKey: 'manual-key',
        token: 'manual-token'
      }
    });
    expect(output.output).toEqual({
      apiKey: 'manual-key',
      token: 'manual-token'
    });

    authMocks.profileGet.mockResolvedValueOnce({
      data: {
        id: 'manual-member',
        username: 'manual-user'
      }
    });
    let profile = await client.getAuthProfile({
      authenticationMethodId: 'api_key_token',
      output: output.output,
      input: {
        apiKey: 'manual-key',
        token: 'manual-token'
      },
      scopes: []
    });

    expect(authMocks.profileGet).toHaveBeenCalledWith('/members/me', {
      params: {
        key: 'manual-key',
        token: 'manual-token',
        fields: 'id,fullName,username,email,avatarUrl'
      }
    });
    expect(profile.profile).toEqual({
      id: 'manual-member',
      name: 'manual-user'
    });
  });
});
