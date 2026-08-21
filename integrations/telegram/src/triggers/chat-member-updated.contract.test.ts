import { describe, expect, it } from 'vitest';
import { handleTelegramUpdate } from './contract-test-helpers';

describe('chat_member_updated contract', () => {
  it('maps each member update variant independently', async () => {
    for (let eventType of ['my_chat_member', 'chat_member', 'chat_join_request'] as const) {
      let result = await handleTelegramUpdate('chat_member_updated', {
        update_id: 3,
        [eventType]: { value: eventType }
      });
      expect(result.inputs).toEqual([
        { updateId: 3, eventType, eventData: { value: eventType } }
      ]);
    }
  });
});
