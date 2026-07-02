import { describe, expect, it } from 'vitest';
import {
  ensureAtLeastOneField,
  limitsObject,
  paymentSourceObject,
  requireConfirm,
  requireIdempotencyKey
} from './validation';

describe('Natural validation helpers', () => {
  it('requires confirmation for high-risk actions', () => {
    expect(() => requireConfirm(false, 'send funds')).toThrow(/confirm/i);
    expect(() => requireConfirm(true, 'send funds')).not.toThrow();
  });

  it('requires idempotency keys for Natural idempotent mutations', () => {
    expect(() => requireIdempotencyKey(undefined, 'create a payment')).toThrow(
      /idempotencyKey/
    );
    expect(() => requireIdempotencyKey('idem_123', 'create a payment')).not.toThrow();
  });

  it('validates payment source variants', () => {
    expect(paymentSourceObject({ paymentSourceType: 'wallet', walletId: 'wal_123' })).toEqual({
      type: 'wallet',
      walletId: 'wal_123'
    });
    expect(() =>
      paymentSourceObject({ paymentSourceType: 'wallet', externalAccountId: 'eac_123' })
    ).toThrow(/walletId/);
  });

  it('preserves null limits for Natural cap clearing semantics', () => {
    expect(limitsObject({ perTransaction: null, perDay: undefined, perMonth: 1000 })).toEqual({
      perTransaction: null,
      perMonth: 1000
    });
  });

  it('rejects empty update bodies', () => {
    expect(() => ensureAtLeastOneField({}, 'agent update')).toThrow(/at least one/);
  });
});
