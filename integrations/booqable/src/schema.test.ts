import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Booqable tool input schemas', provider.actions);

it('retains the legacy inventory tool and registers its documented replacement', () => {
  let legacy = provider.actions.find(action => action.key === 'check_inventory');
  let replacement = provider.actions.find(
    action => action.key === 'get_inventory_availability'
  );

  expect(legacy).toBeDefined();
  expect(replacement).toBeDefined();
  expect(legacy?.tags?.deprecated).toBe(true);
  expect(
    legacy?.description?.startsWith('DEPRECATED — use `get_inventory_availability` instead.')
  ).toBe(true);
  expect(
    legacy?.instructions?.some(instruction =>
      instruction.includes('get_inventory_availability')
    )
  ).toBe(true);
});
