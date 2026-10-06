import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Make tool input schemas', provider.actions);
const legacy = {
  list_scenarios: ['teamId', 'organizationId', 'folderId', 'isActive', 'limit', 'offset'],
  list_data_stores: ['teamId', 'limit', 'offset', 'sortBy', 'sortDir'],
  manage_data_store_records: [
    'dataStoreId',
    'action',
    'recordKey',
    'recordData',
    'limit',
    'offset'
  ],
  get_scenario_logs: ['scenarioId', 'limit', 'offset'],
  list_organizations: [],
  list_users: ['organizationId', 'teamId', 'limit', 'offset'],
  get_usage: ['organizationId', 'teamId'],
  list_hooks: ['teamId', 'typeName', 'assigned', 'limit', 'offset'],
  manage_scenario: [
    'scenarioId',
    'action',
    'name',
    'scheduling',
    'folderId',
    'targetTeamId',
    'cloneName'
  ],
  manage_connection: ['connectionId', 'action', 'name'],
  create_scenario: ['teamId', 'name', 'blueprint', 'scheduling', 'folderId'],
  manage_data_store: [
    'action',
    'dataStoreId',
    'teamId',
    'name',
    'dataStructureId',
    'maxSizeMB'
  ],
  list_teams: ['organizationId', 'limit', 'offset'],
  list_connections: ['teamId', 'limit', 'offset'],
  manage_hook: ['action', 'hookId', 'teamId', 'name', 'typeName']
};
describe('Make legacy and bounded public contracts', () => {
  for (const [key, fields] of Object.entries(legacy))
    it(`retains ${key} input fields`, () => {
      const action = provider.actions.find(item => item.key === key);
      expect(action).toBeDefined();
      const schema = z.toJSONSchema(action!.inputSchema) as {
        properties: Record<string, unknown>;
      };
      for (const field of fields) expect(schema.properties).toHaveProperty(field);
    });
  it('registers exactly nineteen public tools with short IDs', () => {
    expect(provider.actions.map(a => a.key).sort()).toEqual(
      [
        ...Object.keys(legacy),
        'get_current_user',
        'list_data_structures',
        'get_execution_status',
        'download_blueprint'
      ].sort()
    );
    for (const action of provider.actions)
      expect(`make-${action.key}`.length).toBeLessThan(60);
  });
  it('retains optional legacy create fields while native requirements remain runtime guidance', () => {
    expect(
      provider.actions
        .find(a => a.key === 'create_scenario')!
        .inputSchema.safeParse({ teamId: 1 }).success
    ).toBe(true);
  });
});
