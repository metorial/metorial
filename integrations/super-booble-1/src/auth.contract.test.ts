import { describe, expect, it } from 'vitest';
import { auth } from './auth';
import { superGoogle1ConfigSchema } from './config';
import { superGoogle1OAuthScopes } from './scopes';

describe('Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 1 auth and config contract', () => {
  it('exposes one OAuth method with the exact ordered aggregate scopes', () => {
    expect(auth.authStack).toHaveLength(1);
    let oauth = auth.authStack[0];
    expect(oauth).toMatchObject({
      type: 'auth.oauth',
      key: 'oauth',
      name: 'G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ OAuth',
      scopes: superGoogle1OAuthScopes
    });
    expect((oauth as any).handleTokenRefresh).toBeTypeOf('function');
    expect((oauth as any).getProfile).toBeTypeOf('function');
  });

  it('requires the OAuth runtime fields used by imported tools', () => {
    expect(
      auth.outputSchema.parse({
        token: 'token',
        refreshToken: 'refresh-token',
        expiresAt: '2026-09-01T00:00:00.000Z',
        authMethod: 'oauth'
      })
    ).toEqual({
      token: 'token',
      refreshToken: 'refresh-token',
      expiresAt: '2026-09-01T00:00:00.000Z',
      authMethod: 'oauth'
    });
    expect(
      auth.outputSchema.safeParse({ token: 'token', authMethod: 'google_oauth' }).success
    ).toBe(false);
  });

  it('keeps source configuration optional and defaults Gmail to the current user', () => {
    expect(superGoogle1ConfigSchema.parse({})).toEqual({ userId: 'me' });
    expect(
      superGoogle1ConfigSchema.parse({
        userId: 'person@example.com',
        defaultSpace: ' spaces/AAAA '
      })
    ).toEqual({
      userId: 'person@example.com',
      defaultSpace: 'spaces/AAAA'
    });
    expect(superGoogle1ConfigSchema.safeParse({ defaultSpace: '  ' }).success).toBe(false);
  });
});
