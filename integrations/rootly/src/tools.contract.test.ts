import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Rootly tool schemas', provider.actions);
describe('Rootly legacy contracts', () => {
  it('preserves the original keys and tool ID limits', () => {
    const keys = new Set(provider.actions.map(action => action.key));
    for (const key of [
      'list_incidents',
      'get_incident',
      'create_incident',
      'update_incident',
      'list_alerts',
      'create_alert',
      'manage_alert',
      'list_on_call',
      'list_schedules',
      'list_escalation_policies',
      'list_services',
      'list_teams',
      'list_users',
      'list_action_items',
      'create_action_item',
      'update_action_item',
      'list_heartbeats',
      'create_heartbeat',
      'list_workflows',
      'list_severities',
      'list_environments'
    ])
      expect(keys.has(key)).toBe(true);
    expect(provider.actions).toHaveLength(27);
    for (const action of provider.actions)
      expect(`rootly-${action.key}`.length).toBeLessThan(60);
  });
});
