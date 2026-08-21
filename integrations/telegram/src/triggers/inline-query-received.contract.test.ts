import { describe, expect, it } from 'vitest';
import { handleTelegramUpdate } from './contract-test-helpers';

describe('inline_query_received contract', () => {
  it('maps both inline update variants', async () => {
    for (let eventType of ['inline_query', 'chosen_inline_result'] as const) {
      let result = await handleTelegramUpdate('inline_query_received', {
        update_id: 4,
        [eventType]: { value: eventType }
      });
      expect(result.inputs).toEqual([
        { updateId: 4, eventType, inlineData: { value: eventType } }
      ]);
    }
  });
});
