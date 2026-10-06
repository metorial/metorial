import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Fivetran tool input schemas', provider.actions);
it('retains original tool keys and production ID lengths', () => {
  const original = [
    'list_groups',
    'get_group',
    'create_group',
    'update_group',
    'delete_group',
    'list_connections',
    'get_connection',
    'create_connection',
    'update_connection',
    'delete_connection',
    'trigger_sync',
    'get_connection_schema',
    'update_connection_schema',
    'reload_connection_schema',
    'list_destinations',
    'get_destination',
    'create_destination',
    'update_destination',
    'delete_destination',
    'list_users',
    'get_user',
    'invite_user',
    'update_user',
    'delete_user',
    'list_teams',
    'get_team',
    'create_team',
    'update_team',
    'delete_team',
    'manage_team_membership',
    'list_transformations',
    'get_transformation',
    'create_transformation',
    'update_transformation',
    'delete_transformation',
    'run_transformation',
    'list_connector_types',
    'get_connector_type',
    'list_webhooks',
    'create_webhook',
    'update_webhook',
    'delete_webhook'
  ];
  const keys = provider.actions.map(action => action.key);
  expect(keys).toEqual(expect.arrayContaining(original));
  for (const key of keys) expect(`fivetran-${key}`.length).toBeLessThan(60);
});
const schemaFor = (key: string) => {
  const action = provider.actions.find(action => action.key === key);
  if (!action || action.type !== 'tool') throw new Error(`Missing original tool ${key}`);
  return z.record(z.string(), z.unknown()).parse(z.toJSONSchema(action.inputSchema));
};
it('preserves optional and numeric legacy inputs', () => {
  const connection = schemaFor('create_connection');
  const properties = z.record(z.string(), z.unknown()).parse(connection.properties);
  expect(z.record(z.string(), z.unknown()).parse(properties.syncFrequency).type).toBe(
    'number'
  );
  expect(connection.required).not.toContain('config');
  expect(connection.required).not.toContain('paused');
  expect(schemaFor('create_destination').required).not.toContain('timeZoneOffset');
  const user = schemaFor('invite_user');
  expect(user.required).not.toContain('givenName');
  expect(user.required).not.toContain('familyName');
  expect(schemaFor('get_user').required ?? []).not.toContain('userId');
});
