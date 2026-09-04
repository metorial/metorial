import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  createAxios: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  authMocks.createAxios.mockImplementation(() => ({
    get: authMocks.get,
    post: authMocks.post
  }));
  return { ...actual, createAxios: authMocks.createAxios };
});

import { provider } from './index';
import { IDENTITY_BASE_URL } from './lib/constants';

const profileScope = 'https://identity.company-information.service.gov.uk/user/profile.read';

let createClient = () => createLocalSlateTestClient({ slate: provider });

describe('Companies House OAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the authorization URL and exchanges the callback code', async () => {
    let client = createClient();
    let authorization = await client.getAuthorizationUrl({
      authenticationMethodId: 'oauth',
      redirectUri: 'https://example.com/oauth/callback',
      state: 'state-123',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [profileScope]
    });
    let url = new URL(authorization.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(`${IDENTITY_BASE_URL}/oauth2/authorise`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: 'client-id',
      redirect_uri: 'https://example.com/oauth/callback',
      state: 'state-123',
      scope: profileScope
    });

    authMocks.post.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: '3600',
        token_type: 'Bearer'
      }
    });
    let callback = await client.handleAuthorizationCallback({
      authenticationMethodId: 'oauth',
      code: 'authorization-code',
      state: 'state-123',
      redirectUri: 'https://example.com/oauth/callback',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [profileScope]
    });

    expect(callback.output).toEqual({
      token: 'access-token',
      refreshToken: 'refresh-token',
      expiresAt: expect.any(String),
      authMethod: 'oauth'
    });
    let [path, body, config] = authMocks.post.mock.calls[0]!;
    expect(path).toBe('/oauth2/token');
    expect(Object.fromEntries(new URLSearchParams(body))).toEqual({
      grant_type: 'authorization_code',
      code: 'authorization-code',
      client_id: 'client-id',
      client_secret: 'client-secret',
      redirect_uri: 'https://example.com/oauth/callback'
    });
    expect(config).toEqual({
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  });

  it('refreshes tokens, preserves the original refresh token, and reads the profile', async () => {
    let client = createClient();
    authMocks.post.mockResolvedValueOnce({
      data: { access_token: 'new-access-token', expires_in: 3600, token_type: 'Bearer' }
    });

    let refreshed = await client.refreshToken({
      authenticationMethodId: 'oauth',
      output: {
        token: 'old-access-token',
        refreshToken: 'refresh-token',
        authMethod: 'oauth'
      },
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [profileScope]
    });
    expect(refreshed.output).toEqual({
      token: 'new-access-token',
      refreshToken: 'refresh-token',
      expiresAt: expect.any(String),
      authMethod: 'oauth'
    });

    authMocks.get.mockResolvedValueOnce({
      data: {
        id: 'user-123',
        forename: 'Ada',
        surname: 'Lovelace',
        email: 'ada@example.com'
      }
    });
    let profile = await client.getAuthProfile({
      authenticationMethodId: 'oauth',
      output: refreshed.output,
      input: {},
      scopes: [profileScope]
    });
    expect(profile.profile).toEqual({
      id: 'user-123',
      name: 'Ada Lovelace',
      email: 'ada@example.com'
    });
    expect(authMocks.get).toHaveBeenCalledWith('/user/profile', {
      headers: { Authorization: 'Bearer new-access-token' }
    });
  });
});
