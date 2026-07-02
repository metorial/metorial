import { describe, expect, it } from 'vitest';
import {
  buildVismaTokenExchangeBody,
  buildVismaTokenRefreshBody,
  resolveVismaNetTenantId
} from './auth';

describe('Visma Net OAuth helpers', () => {
  it('requires tenantId from config or auth output', () => {
    expect(resolveVismaNetTenantId({ tenantId: ' tenant-123 ' })).toBe('tenant-123');
    expect(resolveVismaNetTenantId({}, { tenantId: 'tenant-from-output' })).toBe(
      'tenant-from-output'
    );
    expect(() => resolveVismaNetTenantId({})).toThrow('Visma Net tenantId is required');
  });

  it('includes tenant_id in authorization-code token exchange body', () => {
    let body = new URLSearchParams(
      buildVismaTokenExchangeBody({
        code: 'code-123',
        redirectUri: 'https://example.com/callback',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        tenantId: 'tenant-123'
      })
    );

    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('code-123');
    expect(body.get('tenant_id')).toBe('tenant-123');
  });

  it('includes tenant_id in refresh token body', () => {
    let body = new URLSearchParams(
      buildVismaTokenRefreshBody({
        refreshToken: 'refresh-token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        tenantId: 'tenant-123'
      })
    );

    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('refresh-token');
    expect(body.get('tenant_id')).toBe('tenant-123');
  });
});
