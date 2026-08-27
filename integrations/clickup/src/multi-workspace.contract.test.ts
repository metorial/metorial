import { createLocalSlateTestClient, getSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

let workspaceScopedToolIds = [
  'get_workspace_members',
  'get_spaces',
  'create_space',
  'get_goals',
  'create_goal',
  'get_time_entries',
  'create_time_entry',
  'update_time_entry',
  'delete_time_entry',
  'get_running_timer',
  'start_timer',
  'stop_timer',
  'search_tasks'
];

type JsonSchema = {
  properties?: Record<string, { minLength?: number }>;
  required?: string[];
};

describe('ClickUp multi-workspace provider contract', () => {
  it('has no global Workspace configuration', async () => {
    let contract = await getSlateContract(createLocalSlateTestClient({ slate: provider }));

    expect(contract.configSchema.properties ?? {}).toEqual({});
    expect(contract.configSchema.required ?? []).not.toContain('workspaceId');
  });

  it('requires a non-empty workspaceId for all 13 Workspace-scoped tools', async () => {
    let contract = await getSlateContract(createLocalSlateTestClient({ slate: provider }));

    for (let toolId of workspaceScopedToolIds) {
      let tool = contract.tools.find(candidate => candidate.id === toolId);
      let inputSchema = tool?.inputSchema as JsonSchema | undefined;

      expect(tool, `${toolId} must exist`).toBeTruthy();
      expect(inputSchema?.required, `${toolId} must require workspaceId`).toContain(
        'workspaceId'
      );
      expect(
        inputSchema?.properties?.workspaceId?.minLength,
        `${toolId}.workspaceId must reject empty strings`
      ).toBe(1);
    }
  });

  it('requires workspaceId for search_tasks even when listId is supplied', async () => {
    let contract = await getSlateContract(createLocalSlateTestClient({ slate: provider }));
    let searchTasks = contract.tools.find(tool => tool.id === 'search_tasks');
    let inputSchema = searchTasks?.inputSchema as JsonSchema | undefined;

    expect(inputSchema?.properties).toHaveProperty('listId');
    expect(inputSchema?.required).toContain('workspaceId');
  });

  it('keeps get_workspaces and resource-ID-only tools free of workspaceId', async () => {
    let contract = await getSlateContract(createLocalSlateTestClient({ slate: provider }));
    let resourceIdOnlyTools = contract.tools.filter(
      tool => !workspaceScopedToolIds.includes(tool.id)
    );

    expect(resourceIdOnlyTools.find(tool => tool.id === 'get_workspaces')).toBeTruthy();
    for (let tool of resourceIdOnlyTools) {
      let inputSchema = tool.inputSchema as JsonSchema;
      expect(inputSchema.properties, `${tool.id} must omit workspaceId`).not.toHaveProperty(
        'workspaceId'
      );
      expect(
        inputSchema.required ?? [],
        `${tool.id} must not require workspaceId`
      ).not.toContain('workspaceId');
    }
  });
});
