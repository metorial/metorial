import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { provider } from './index';
import { simulateTransaction } from './tools/simulate-transaction';

describe('Alchemy tool contracts', () => {
  it('keeps every input schema compatible with object-based tool bridges', () => {
    assert.equal(
      new Set(provider.actions.map(action => action.key)).size,
      provider.actions.length
    );
    for (let action of provider.actions) {
      if (action.type !== 'tool') continue;
      let schema = z.toJSONSchema(action.inputSchema, { unrepresentable: 'any' });
      assert.equal(schema.type, 'object');
      assert.equal(schema.anyOf, undefined);
      assert.equal(schema.oneOf, undefined);
      assert.equal(schema.allOf, undefined);
    }
  });

  it('retains the retired simulation key and clearly marks its status', () => {
    assert.ok(provider.actions.some(action => action.key === 'simulate_transaction'));
    assert.ok(provider.actions.some(action => action.key === 'call_contract'));
    assert.equal(simulateTransaction.tags?.deprecated, true);
    assert.ok(simulateTransaction.description?.includes('DEPRECATED'));
    assert.ok(simulateTransaction.description?.includes('September 30, 2026'));
  });
});
