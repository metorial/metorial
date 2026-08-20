import { describe, expect, it } from 'vitest';
import { handleTelegramUpdate } from './contract-test-helpers';

describe('poll_updated contract', () => {
  it('maps poll and poll_answer independently', async () => {
    for (let eventType of ['poll', 'poll_answer'] as const) {
      let result = await handleTelegramUpdate('poll_updated', {
        update_id: 7,
        [eventType]: { value: eventType }
      });
      expect(result.inputs).toEqual([
        { updateId: 7, eventType, pollData: { value: eventType } }
      ]);
    }
  });
});
