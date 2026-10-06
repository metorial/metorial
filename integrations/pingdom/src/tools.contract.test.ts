import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { listChecks } from './tools';

describeMcpCompatibleToolSchemas('Pingdom tool schemas', provider.actions);
describe('Pingdom legacy contracts', () => {
  it('preserves all original tool keys', () => {
    const keys = new Set(provider.actions.map(action => action.key));
    for (const key of [
      'list_checks',
      'get_check',
      'create_check',
      'update_check',
      'delete_check',
      'get_check_results',
      'get_summary',
      'list_contacts',
      'create_contact',
      'update_contact',
      'delete_contact',
      'list_teams',
      'create_team',
      'update_team',
      'delete_team',
      'list_maintenance',
      'create_maintenance',
      'update_maintenance',
      'delete_maintenance',
      'list_tms_checks',
      'get_tms_check',
      'delete_tms_check',
      'perform_single_check',
      'list_probes',
      'get_account_info',
      'list_actions',
      'get_analysis'
    ])
      expect(keys.has(key)).toBe(true);
    expect(provider.actions).toHaveLength(30);
    for (const action of provider.actions)
      expect(`pingdom-${action.key}`.length).toBeLessThan(60);
    expect(z.toJSONSchema(listChecks.outputSchema).properties?.counts).toMatchObject({
      required: ['total', 'filtered']
    });
  });
});
