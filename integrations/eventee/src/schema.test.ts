import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Eventee tool input schemas', provider.actions);

it('preserves existing tool keys and unique short production IDs', () => {
  let keys = provider.actions.map(action => action.key);
  for (let key of [
    'get_event_content',
    'list_participants',
    'list_registrations',
    'invite_attendees'
  ]) {
    expect(keys).toContain(key);
  }
  expect(new Set(keys).size).toBe(keys.length);
  for (let key of keys) expect(`eventee-${key}`.length).toBeLessThan(60);
});
