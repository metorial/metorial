import {
  describeMcpCompatibleToolSchemas,
  getMcpCompatibleToolSchemaCases
} from '@slates/test';
import { expect, it } from 'vitest';
import { provider } from './index';
import { spec } from './spec';

const tools = new Map(getMcpCompatibleToolSchemaCases(provider.actions));
describeMcpCompatibleToolSchemas('Nutshell tool input schemas', provider.actions);
it('preserves the 23 original keys and four essential additions', () => {
  expect([...tools.keys()].sort()).toEqual(
    [
      'create_contact',
      'get_contact',
      'update_contact',
      'find_contacts',
      'create_account',
      'get_account',
      'update_account',
      'find_accounts',
      'create_lead',
      'get_lead',
      'update_lead',
      'find_leads',
      'create_activity',
      'find_activities',
      'create_task',
      'add_note',
      'search_crm',
      'list_products',
      'list_pipelines_stages',
      'list_users_teams',
      'list_activity_types',
      'list_sources',
      'get_timeline',
      'get_current_user',
      'get_record',
      'delete_record',
      'list_custom_fields'
    ].sort()
  );
  expect([...tools.keys()].every(key => `nutshell-${key}`.length < 60)).toBe(true);
});
it('retains stored API-key credentials and empty config', () => {
  expect(
    spec.authSchema.parse({ username: 'schema@example.invalid', token: 'schema-placeholder' })
  ).toEqual({ username: 'schema@example.invalid', token: 'schema-placeholder' });
  expect(spec.configSchema.parse({})).toEqual({});
});
it('keeps legacy numeric IDs, optional fields, and task description', () => {
  expect(
    tools
      .get('create_task')!
      .inputSchema.safeParse({ description: 'Legacy task', leadIds: [1] }).success
  ).toBe(true);
  expect(
    tools.get('create_contact')!.inputSchema.safeParse({
      name: 'Legacy contact',
      address: { address1: 'Street' },
      customFields: { Score: 2 }
    }).success
  ).toBe(true);
  expect(
    tools.get('update_lead')!.inputSchema.safeParse({ leadId: 1, status: 10, outcomeId: 2 })
      .success
  ).toBe(true);
  expect(tools.get('get_contact')!.inputSchema.safeParse({ contactId: '1' }).success).toBe(
    false
  );
});
it('keeps record variants in top-level object schemas', () => {
  for (const entityType of ['Contacts', 'Accounts', 'Leads', 'Activities', 'Tasks', 'Notes'])
    expect(
      tools.get('delete_record')!.inputSchema.safeParse({ entityType, entityId: 1, rev: '0' })
        .success
    ).toBe(true);
  for (const entityType of ['Activities', 'Tasks', 'Notes'])
    expect(
      tools.get('get_record')!.inputSchema.safeParse({ entityType, entityId: 1 }).success
    ).toBe(true);
});
