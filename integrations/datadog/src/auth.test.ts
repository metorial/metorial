import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from './auth';
import { config } from './config';

// Live OAuth requires an approved Datadog partner client, unavailable in the test
// account. These offline contract tests cover the handshake and refresh instead.
const http = vi.hoisted(() => ({ post: vi.fn(), create: vi.fn() }));
vi.mock('slates', async importOriginal => ({
  ...(await importOriginal<typeof import('slates')>()),
  createAxios: http.create
}));

const oauth = auth.authStack.find(method => method.type === 'auth.oauth');
if (!oauth || oauth.type !== 'auth.oauth') throw new Error('OAuth method missing');
const context = {
  input: { site: 'datadoghq.com' },
  clientId: 'client-id',
  clientSecret: 'client-secret',
  redirectUri: 'http://127.0.0.1:45873/callback',
  state: 'callback-state',
  scopes: ['dashboards_read']
};
const output = {
  token: 'old-access',
  refreshToken: 'old-refresh',
  apiKey: 'retained-intake-key',
  site: 'datadoghq.eu',
  authMethod: 'oauth' as const
};

beforeEach(() => {
  vi.resetAllMocks();
  http.create.mockReturnValue({ post: http.post });
});

describe('Datadog OAuth contract', () => {
  it('binds a unique S256 challenge to the saved verifier and preserves state', async () => {
    const first = await oauth.getAuthorizationUrl(context);
    const second = await oauth.getAuthorizationUrl(context);
    const url = new URL(first.url);
    const verifier = first.callbackState?.codeVerifier;
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(verifier).not.toBe(second.callbackState?.codeVerifier);
    expect(url.searchParams.get('code_challenge')).toBe(
      createHash('sha256').update(verifier).digest('base64url')
    );
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe(context.state);
    expect(url.searchParams.get('redirect_uri')).toBe(context.redirectUri);
    expect(url.searchParams.get('client_secret')).toBeNull();
    expect(url.searchParams.get('code_verifier')).toBeNull();
  });

  it('exchanges the code in the returned region and persists that region', async () => {
    const start = await oauth.getAuthorizationUrl(context);
    http.post.mockResolvedValue({
      data: { access_token: 'access', refresh_token: 'refresh' }
    });
    const before = Date.now();
    const result = await oauth.handleCallback({
      ...context,
      code: 'code',
      callbackParams: { domain: 'datadoghq.eu' },
      callbackState: start.callbackState!
    });
    expect(http.create).toHaveBeenCalledWith({ baseURL: 'https://api.datadoghq.eu' });
    const body = new URLSearchParams(http.post.mock.calls[0]![1]);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code_verifier')).toBe(start.callbackState?.codeVerifier);
    expect(body.get('redirect_uri')).toBe(context.redirectUri);
    expect(body.get('client_secret')).toBe(context.clientSecret);
    expect(result.input?.site).toBe('datadoghq.eu');
    expect(result.output.site).toBe('datadoghq.eu');
    expect(Date.parse(result.output.expiresAt!)).toBeGreaterThanOrEqual(before + 3600_000);
  });

  it.each([
    'attacker.example',
    'datadoghq.com.attacker.example'
  ])('rejects callback domain %s before transmitting credentials', async domain => {
    await expect(
      oauth.handleCallback({
        ...context,
        code: 'code',
        callbackState: {},
        callbackParams: { domain }
      })
    ).rejects.toThrow(/unsupported OAuth site/);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('rejects a missing PKCE verifier before exchanging the code', async () => {
    await expect(
      oauth.handleCallback({ ...context, code: 'code', callbackState: {} })
    ).rejects.toThrow(/PKCE verifier/);
    expect(http.post).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    'replacement-refresh'
  ])('preserves refresh state when replacement is %s', async refreshToken => {
    http.post.mockResolvedValue({
      data: { access_token: 'new-access', refresh_token: refreshToken, expires_in: 1800 }
    });
    const result = await oauth.handleTokenRefresh!({ ...context, output });
    expect(http.create).toHaveBeenCalledWith({ baseURL: 'https://api.datadoghq.eu' });
    expect(result.output).toMatchObject({
      ...output,
      token: 'new-access',
      refreshToken: refreshToken ?? 'old-refresh'
    });
    expect(result.input?.site).toBe('datadoghq.eu');
    const body = new URLSearchParams(http.post.mock.calls[0]![1]);
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('old-refresh');
  });

  it('rejects a missing refresh token without a network call', async () => {
    await expect(
      oauth.handleTokenRefresh!({ ...context, output: { ...output, refreshToken: undefined } })
    ).rejects.toThrow(/requires a saved refresh token/);
    expect(http.post).not.toHaveBeenCalled();
  });

  it.each([
    { access_token: '' },
    { access_token: 'access', expires_in: -1 }
  ])('rejects malformed token response %j', async data => {
    http.post.mockResolvedValue({ data });
    await expect(oauth.handleTokenRefresh!({ ...context, output })).rejects.toThrow(
      /invalid OAuth token response/
    );
  });

  it('retains legacy site configuration without declaring a duplicate auth setting', () => {
    expect(config.configSchema.parse({ site: 'datadoghq.eu' })).toEqual({
      site: 'datadoghq.eu'
    });
  });
});
