import { describe, expect, it } from 'vitest';
import { handleTelegramUpdate } from './contract-test-helpers';

describe('callback_query_received contract', () => {
  it('isolates callback_query updates', async () => {
    let result = await handleTelegramUpdate('callback_query_received', {
      update_id: 1,
      callback_query: { id: 'callback-1' }
    });
    expect(result.inputs).toEqual([{ updateId: 1, callbackQuery: { id: 'callback-1' } }]);
  });
});
