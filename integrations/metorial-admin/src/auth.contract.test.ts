import { describe, expect, it } from 'vitest';
import { auth } from './auth';

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

  it('keeps OAuth as the first auth method and adds API key as an alternative', () => {
    expect(auth.authStack.map(method => method.key)).toEqual(['oauth', 'api_key']);
  });

  it('creates API key auth output with the shared bearer token shape', async () => {
    let result = await getApiKey().getOutput({
      input: {
        apiKey: 'metorial-api-key',
        apiUrl: 'https://api.example.test/'
      }
    });

    expect(result.output).toEqual({
      token: 'metorial-api-key',
      apiUrl: 'https://api.example.test'
    });
  });

  it('does not force the default API URL into API key auth output', async () => {
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

  it('lets OAuth apiUrl input override config and persists the resolved apiUrl', async () => {
    let result = await getOauth().getAuthorizationUrl({
      redirectUri: 'http://localhost:1234/callback',
      state: 'state-123',
      input: { apiUrl: 'https://oauth.example.test/' },
      config: { apiUrl: 'https://config.example.test/' },
      clientId: 'client-123',
      clientSecret: 'secret-123',
      scopes: ['openid']
    });
    let url = new URL(result.url);

    expect(url.origin).toBe('https://oauth.example.test');
    expect(result.callbackState?.apiUrl).toBe('https://oauth.example.test');
  });
});
