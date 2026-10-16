import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { provider } from './index';

// Registration metadata cannot be established by a live provider request.
describe('barcode generation deprecation contract', () => {
  it('retains the legacy tool and registers its file replacement', () => {
    let legacy = provider.actions.find(action => action.key === 'generate_barcode');
    let replacement = provider.actions.find(action => action.key === 'generate_barcode_file');
    assert.ok(legacy);
    assert.ok(replacement);
    assert.equal(legacy.tags?.deprecated, true);
    assert.ok(
      legacy.description?.startsWith(' DEPRECATED — use `generate_barcode_file` instead. ')
    );
    assert.ok(
      legacy.instructions?.some(instruction => instruction.includes('generate_barcode_file'))
    );
  });
});
