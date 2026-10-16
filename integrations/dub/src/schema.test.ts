import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Dub tool input schemas', provider.actions);

it('keeps the historical tools and production IDs', () => {
  let keys = provider.actions.map(action => action.key);
  for (let key of [
    'create_link',
    'update_link',
    'get_link',
    'list_links',
    'upsert_link',
    'delete_link',
    'get_analytics',
    'track_lead',
    'track_sale',
    'manage_tags',
    'manage_domains',
    'list_customers',
    'get_metatags',
    'list_events'
  ])
    expect(keys).toContain(key);
  expect(new Set(keys).size).toBe(keys.length);
  for (let key of keys) expect(`dub-${key}`.length).toBeLessThan(60);
});
