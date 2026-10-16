import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Instacart tool input schemas', provider.actions);

it('keeps the legacy cart reservation alongside its current replacement', () => {
  let legacy = provider.actions.find(action => action.key === 'reserve_service_option');
  expect(legacy).toBeDefined();
  expect(legacy?.tags?.deprecated).toBe(true);
  expect(provider.actions.some(action => action.key === 'reserve_time_slot')).toBe(true);
});
