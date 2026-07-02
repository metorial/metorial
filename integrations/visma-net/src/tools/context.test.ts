import { describe, expect, it } from 'vitest';
import { createVismaNetClient } from './context';

describe('Visma Net tool context', () => {
  it('rejects tenant mismatches between OAuth output and config', () => {
    expect(() =>
      createVismaNetClient({
        auth: {
          token: 'token',
          tenantId: 'tenant-a'
        },
        config: {
          tenantId: 'tenant-b'
        }
      })
    ).toThrow('Configured Visma Net tenantId does not match');
  });
});
