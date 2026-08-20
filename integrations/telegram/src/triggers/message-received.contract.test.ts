import { describe, expect, it } from 'vitest';
import { handleTelegramUpdate } from './contract-test-helpers';

describe('message_received contract', () => {
  it('maps all four message update variants', async () => {
    for (let eventType of [
      'message',
      'edited_message',
      'channel_post',
      'edited_channel_post'
    ] as const) {
      let result = await handleTelegramUpdate('message_received', {
        update_id: 5,
        [eventType]: { message_id: 1 }
      });
      expect(result.inputs).toEqual([{ updateId: 5, eventType, message: { message_id: 1 } }]);
    }
  });
});
