import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Terraform Cloud tool inputs', provider.actions);
it('preserves saved legacy API URLs without requiring duplicate configuration', () => {
  const baseUrl = 'https://terraform.example.invalid/api/v2';
  const config = provider.spec.configSchema.parse({ organizationName: 'test', baseUrl });
  expect(config).toMatchObject({ organizationName: 'test', baseUrl });
});
it('retains all historical keys and short production IDs', () => {
  for (const key of [
    'list_workspaces',
    'get_workspace',
    'create_workspace',
    'update_workspace',
    'delete_workspace',
    'lock_unlock_workspace',
    'list_runs',
    'get_run',
    'create_run',
    'manage_run',
    'list_variables',
    'create_variable',
    'update_variable',
    'delete_variable',
    'list_projects',
    'create_project',
    'update_project',
    'delete_project',
    'list_teams',
    'create_team',
    'delete_team',
    'manage_team_members',
    'set_team_workspace_access',
    'list_state_versions',
    'get_current_state',
    'list_policy_sets',
    'create_policy_set',
    'delete_policy_set',
    'list_notifications',
    'create_notification',
    'delete_notification',
    'get_organization',
    'list_variable_sets',
    'create_variable_set',
    'delete_variable_set',
    'list_run_triggers',
    'create_run_trigger',
    'delete_run_trigger'
  ])
    expect(provider.actions.some(tool => tool.key === key)).toBe(true);
  expect(provider.actions).toHaveLength(42);
  for (const tool of provider.actions)
    expect(`terraform-cloud-${tool.key}`.length).toBeLessThan(60);
});
