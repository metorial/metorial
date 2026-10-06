import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Hightouch tool input schemas', provider.actions);
it('retains all historical tool keys and short production IDs', () => {
  for (const key of [
    'list_sources',
    'get_source',
    'create_source',
    'update_source',
    'list_destinations',
    'get_destination',
    'create_destination',
    'update_destination',
    'list_models',
    'get_model',
    'create_model',
    'update_model',
    'list_syncs',
    'get_sync',
    'create_sync',
    'update_sync',
    'trigger_sync',
    'trigger_sync_sequence',
    'list_sync_runs',
    'get_sync_sequence_run'
  ])
    expect(provider.actions.some(tool => tool.key === key)).toBe(true);
  expect(provider.actions).toHaveLength(22);
  for (const tool of provider.actions) expect(`hightouch-${tool.key}`.length).toBeLessThan(60);
});
