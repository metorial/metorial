import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from './auth';
import { config } from './config';

let http = vi.hoisted(() => ({
  post: vi.fn()
}));

vi.mock('@slates/provider', async importOriginal => {
  let actual = await importOriginal<typeof import('@slates/provider')>();

  return {
    ...actual,
    createAxios: () => ({
      post: http.post
    })
  };
});

let getOauthMethod = (key: string) => {
  let method = auth.authStack.find(candidate => candidate.key === key);
  expect(method).toBeDefined();
  expect(method?.type).toBe('auth.oauth');
  return method as Extract<(typeof auth.authStack)[number], { type: 'auth.oauth' }>;
};

beforeEach(() => {
  http.post.mockReset();
  http.post.mockResolvedValue({
    data: {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      x_refresh_token_expires_in: 8_726_400
    }
  });
});

describe('QuickBooks auth contract', () => {
  it('exposes Production first and Sandbox second with no generic method', () => {
    expect(auth.authStack.map(method => ({ key: method.key, name: method.name }))).toEqual([
      { key: 'quickbooks_oauth_production', name: 'Production' },
      { key: 'quickbooks_oauth_sandbox', name: 'Sandbox' }
    ]);
  });

  it('keeps environment and company Realm ID exclusively in auth output', () => {
    expect(
      auth.outputSchema.safeParse({
        token: 'access-token',
        realmId: 'realm-123',
        environment: 'production'
      }).success
    ).toBe(true);
    expect(
      auth.outputSchema.safeParse({ token: 'access-token', realmId: 'realm-123' }).success
    ).toBe(false);
    expect(
      auth.outputSchema.safeParse({ token: 'access-token', environment: 'production' }).success
    ).toBe(false);

    expect(
      config.configSchema.parse({
        environment: 'sandbox',
        companyId: 'realm-123',
        webhookVerifierToken: 'verifier-token'
      })
    ).toEqual({ webhookVerifierToken: 'verifier-token' });
  });

  it.each([
    ['quickbooks_oauth_production', 'production'],
    ['quickbooks_oauth_sandbox', 'sandbox']
  ] as const)('persists the pinned environment for %s', async (methodKey, environment) => {
    let method = getOauthMethod(methodKey);
    let result = await method.handleCallback?.({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      code: 'authorization-code',
      redirectUri: 'http://localhost:45873/callback',
      callbackParams: { realmId: 'realm-123' },
      scopes: ['com.intuit.quickbooks.accounting'],
      state: 'state'
    } as never);

    expect(result?.output).toMatchObject({
      token: 'access-token',
      refreshToken: 'refresh-token',
      realmId: 'realm-123',
      environment
    });
  });

  it('rejects an OAuth callback without a company Realm ID', async () => {
    let method = getOauthMethod('quickbooks_oauth_production');

    await expect(
      method.handleCallback?.({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        code: 'authorization-code',
        redirectUri: 'http://localhost:45873/callback',
        callbackParams: {},
        scopes: ['com.intuit.quickbooks.accounting'],
        state: 'state'
      } as never)
    ).rejects.toThrow('QuickBooks OAuth callback did not include a company Realm ID.');
  });

  it('preserves the refresh token and pinned environment during refresh', async () => {
    http.post.mockResolvedValueOnce({
      data: {
        access_token: 'refreshed-access-token',
        expires_in: 3600
      }
    });
    let method = getOauthMethod('quickbooks_oauth_sandbox');
    let result = await method.handleTokenRefresh?.({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      output: {
        token: 'old-access-token',
        refreshToken: 'existing-refresh-token',
        realmId: 'realm-123',
        environment: 'production'
      },
      scopes: ['com.intuit.quickbooks.accounting']
    } as never);

    expect(result?.output).toMatchObject({
      token: 'refreshed-access-token',
      refreshToken: 'existing-refresh-token',
      realmId: 'realm-123',
      environment: 'sandbox'
    });
  });
});
