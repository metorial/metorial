import { createLocalSlateTestClient } from '@slates/test';
import type { SlateRuntimeInfo } from 'slates';
import { describe, expect, it } from 'vitest';
import { auth } from './auth';
import { DEFAULT_API_URL } from './config';
import { provider } from './index';

describe('Metorial Admin auth', () => {
  let getApiKey = () => {
    let apiKey = auth.authStack.find(method => method.key === 'api_key') as
      | { getOutput: (ctx: any) => Promise<any> }
      | undefined;
    expect(apiKey).toBeDefined();
    return apiKey!;
  };

  let getOauth = () => {
    let oauth = auth.authStack.find(method => method.key === 'oauth') as
      | { getAuthorizationUrl: (ctx: any) => Promise<any> }
      | undefined;
    expect(oauth).toBeDefined();
    return oauth!;
  };

  let getAuthorizationUrl = (runtimeInfo?: SlateRuntimeInfo) =>
    createLocalSlateTestClient({
      slate: provider,
      state: { runtimeInfo }
    }).getAuthorizationUrl({
      authenticationMethodId: 'oauth',
      redirectUri: 'http://localhost:1234/callback',
      state: 'state-123',
      input: {},
      clientId: 'client-123',
      clientSecret: 'secret-123',
      scopes: ['openid']
    });

  it('keeps OAuth as the first auth method and adds API key as an alternative', () => {
    expect(auth.authStack.map(method => method.key)).toEqual(['oauth', 'api_key']);
  });

  it('creates API key auth output with the shared bearer token shape', async () => {
    let result = await getApiKey().getOutput({
      input: {
        apiKey: 'metorial-api-key'
      }
    });

    expect(result.output).toEqual({
      token: 'metorial-api-key'
    });
  });

  it('uses S256 PKCE for authorization URLs', async () => {
    let result = await getOauth().getAuthorizationUrl({
      redirectUri: 'http://localhost:1234/callback',
      state: 'state-123',
      input: {},
      clientId: 'client-123',
      clientSecret: 'secret-123',
      scopes: ['openid', 'profile', 'organization.instance:read']
    });
    let url = new URL(result.url);

    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.callbackState?.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  // Contract test: live E2E cannot drive the OAuth redirect or inject the host environment.
  it('sends OAuth to the API URL of the Metorial environment running the slate', async () => {
    let result = await getAuthorizationUrl({
      metorial: { apiUrl: 'https://api-eu1.metorial.test/' }
    });
    let url = new URL(result.authorizationUrl);

    expect(`${url.origin}${url.pathname}`).toBe(
      'https://api-eu1.metorial.test/oauth/authorize'
    );
    expect(result.callbackState).toEqual({ codeVerifier: expect.any(String) });
  });

  it('falls back to the default API URL when the environment provides none', async () => {
    let result = await getAuthorizationUrl();

    expect(new URL(result.authorizationUrl).origin).toBe(DEFAULT_API_URL);
  });

  it('refuses plain http API URLs outside local development', async () => {
    await expect(
      getAuthorizationUrl({ metorial: { apiUrl: 'http://api-eu1.metorial.test' } })
    ).rejects.toMatchObject({ message: expect.stringContaining('must use https') });

    let result = await getAuthorizationUrl({
      metorial: { apiUrl: 'http://metorial-dev:4310', environment: 'development' }
    });
    expect(new URL(result.authorizationUrl).origin).toBe('http://metorial-dev:4310');
  });
});
