import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Wit.ai tool input schemas', provider.actions);

it('registers each tool schema once', () => {
  const keys = provider.actions
    .filter(action => action.type === 'tool')
    .map(action => action.key);
  expect(new Set(keys).size).toBe(keys.length);
});
