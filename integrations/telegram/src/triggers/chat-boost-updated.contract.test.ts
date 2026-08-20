import { describe, expect, it } from 'vitest';
import { handleTelegramUpdate } from './contract-test-helpers';

describe('chat_boost_updated contract', () => {
  it('maps both allowed boost update variants', async () => {
    for (let eventType of ['chat_boost', 'removed_chat_boost'] as const) {
      let result = await handleTelegramUpdate('chat_boost_updated', {
        update_id: 2,
        [eventType]: { boost_id: eventType }
      });
      expect(result.inputs).toEqual([
        { updateId: 2, eventType, boostData: { boost_id: eventType } }
      ]);
    }
  });
});
