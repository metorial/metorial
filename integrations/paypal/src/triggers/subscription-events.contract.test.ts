import { describe, it } from 'vitest';
import { expectPayPalTriggerContract } from './contract-test-helpers';

describe('PayPal subscription_events contract', () => {
  it('uses the shared fail-closed PayPal verifier', () =>
    expectPayPalTriggerContract('subscription_events'));
});
