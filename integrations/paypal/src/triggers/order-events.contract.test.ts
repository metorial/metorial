import { describe, it } from 'vitest';
import { expectPayPalTriggerContract } from './contract-test-helpers';

describe('PayPal order_events contract', () => {
  it('uses the shared fail-closed PayPal verifier', () =>
    expectPayPalTriggerContract('order_events'));
});
