import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('BTCPay Server tool input schemas', provider.actions);

describe('Payout tool deprecation contract', () => {
  it('retains the legacy tool and its current replacement', () => {
    let legacy = provider.actions.find(action => action.key === 'manage_payouts');
    expect(legacy).toBeDefined();
    expect(legacy?.tags?.deprecated).toBe(true);
    expect(provider.actions.some(action => action.key === 'manage_payout_claims')).toBe(true);
  });
});
