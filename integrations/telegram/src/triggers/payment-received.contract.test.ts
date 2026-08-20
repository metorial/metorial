import { describe, expect, it } from 'vitest';
import { handleTelegramUpdate } from './contract-test-helpers';

describe('payment_received contract', () => {
  it('maps each payment update variant independently', async () => {
    for (let eventType of [
      'shipping_query',
      'pre_checkout_query',
      'purchased_paid_media'
    ] as const) {
      let result = await handleTelegramUpdate('payment_received', {
        update_id: 6,
        [eventType]: { value: eventType }
      });
      expect(result.inputs).toEqual([
        { updateId: 6, eventType, paymentData: { value: eventType } }
      ]);
    }
  });
});
