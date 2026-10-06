import {
  describeMcpCompatibleToolSchemas,
  getMcpCompatibleToolSchemaCases
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const cases = getMcpCompatibleToolSchemaCases(provider);
describeMcpCompatibleToolSchemas('Workato tool schemas', provider);
describe('Workato retained contracts', () => {
  it('keeps nineteen legacy keys plus native exact job discovery', () => {
    expect(cases.map(([key]) => key).sort()).toEqual(
      [
        'list_recipes',
        'get_recipe',
        'manage_recipe',
        'start_stop_recipe',
        'get_recipe_versions',
        'list_connections',
        'manage_connection',
        'list_jobs',
        'get_job',
        'list_projects',
        'manage_folder',
        'deploy_project',
        'list_deployments',
        'export_package',
        'manage_lookup_table',
        'manage_event_topic',
        'manage_data_table',
        'manage_environment_properties',
        'manage_api_endpoints',
        'get_workspace_info'
      ].sort()
    );
  });
  for (const [key] of cases)
    it(`${key} retains a short production ID`, () => {
      expect(`workato-${key}`.length).toBeLessThan(60);
    });
  it('preserves omitted action-dependent legacy fields', () => {
    const schema = cases.find(([key]) => key === 'manage_recipe')?.[1].inputSchema;
    expect(schema?.safeParse({ action: 'create' }).success).toBe(true);
  });
  it('preserves existing export inputs and additive status/download fields', () => {
    const schema = cases.find(([key]) => key === 'export_package')?.[1].inputSchema;
    expect(schema?.safeParse({ name: 'archive', folderId: 1 }).success).toBe(true);
    expect(schema?.safeParse({ action: 'status', packageId: '1' }).success).toBe(true);
  });
  it('does not register legacy or replacement triggers', () => {
    expect(
      provider.actions.filter(action => String(action.type).includes('trigger'))
    ).toHaveLength(0);
  });
});
