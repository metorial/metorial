import { describe, expect, it } from 'vitest';
import { handleTelegramUpdate } from './contract-test-helpers';

describe('reaction_updated contract', () => {
  it('maps individual and aggregate reaction updates independently', async () => {
    for (let eventType of ['message_reaction', 'message_reaction_count'] as const) {
      let result = await handleTelegramUpdate('reaction_updated', {
        update_id: 8,
        [eventType]: { value: eventType }
      });
      expect(result.inputs).toEqual([
        { updateId: 8, eventType, reactionData: { value: eventType } }
      ]);
    }
  });
});
