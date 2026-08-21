import { createLocalSlateTestClient } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

let oauthPost = vi.fn();

let loadProviderClient = async () => {
  vi.resetModules();
  oauthPost.mockReset();

  vi.doMock('@slates/provider', async () => {
    let actual = await vi.importActual<typeof import('@slates/provider')>('@slates/provider');

    return {
      ...actual,
      createAxios: vi.fn((config?: { baseURL?: string }) => {
        if (config?.baseURL === 'https://oauth.platform.intuit.com') {
          return { post: oauthPost };
        }

        return actual.createAxios(config);
      })
    };
  });

  let { provider } = await import('./index');
  return createLocalSlateTestClient({ slate: provider as any });
};

afterEach(() => {
  vi.doUnmock('@slates/provider');
  vi.resetModules();
});

describe('QuickBooks webhook verifier auth ownership', () => {
  it('exposes the optional verifier input on every OAuth variant', async () => {
    let client = await loadProviderClient();

    for (let methodId of [
      'quickbooks_oauth',
      'quickbooks_oauth_production',
      'quickbooks_oauth_sandbox'
    ]) {
      let method = await client.getAuthMethod(methodId);
      expect(method.authenticationMethod.inputSchema.properties).toHaveProperty(
        'webhookVerifierToken'
      );
      expect(method.authenticationMethod.inputSchema.required ?? []).not.toContain(
        'webhookVerifierToken'
      );
    }
  });

  it('persists the verifier through callback and refresh output replacement', async () => {
    let client = await loadProviderClient();
    oauthPost.mockResolvedValueOnce({
      data: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        x_refresh_token_expires_in: 86400
      }
    });

    let callback = await client.handleAuthorizationCallback({
      authenticationMethodId: 'quickbooks_oauth_sandbox',
      code: 'auth-code',
      state: 'state',
      redirectUri: 'https://example.com/callback',
      input: { webhookVerifierToken: 'verifier-token' },
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: ['com.intuit.quickbooks.accounting'],
      callbackParams: { realmId: 'realm-id' }
    });

    expect(callback.output).toMatchObject({
      token: 'access-token',
      refreshToken: 'refresh-token',
      realmId: 'realm-id',
      environment: 'sandbox',
      webhookVerifierToken: 'verifier-token'
    });

    oauthPost.mockResolvedValueOnce({
      data: { access_token: 'refreshed-token', expires_in: 1800 }
    });
    let refreshed = await client.refreshToken({
      authenticationMethodId: 'quickbooks_oauth_sandbox',
      output: callback.output,
      input: { webhookVerifierToken: 'verifier-token' },
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: ['com.intuit.quickbooks.accounting']
    });

    expect(refreshed.output).toMatchObject({
      token: 'refreshed-token',
      refreshToken: 'refresh-token',
      realmId: 'realm-id',
      environment: 'sandbox',
      webhookVerifierToken: 'verifier-token'
    });
  });
});
