import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Retool tool input schemas', provider.actions);
describe('Retool retained schema contract', () => {
  it('preserves all legacy keys and the bounded exact reads', () => {
    const keys = provider.actions.map(action => action.key);
    for (const key of [
      'list_users',
      'get_user',
      'create_user',
      'update_user',
      'delete_user',
      'manage_user_attributes',
      'list_groups',
      'get_group',
      'create_group',
      'update_group',
      'delete_group',
      'manage_group_members',
      'list_apps',
      'create_app',
      'update_app',
      'delete_app',
      'list_folders',
      'manage_folder',
      'manage_permissions',
      'list_permissions',
      'list_resources',
      'list_environments',
      'list_workflows',
      'get_workflow_run',
      'list_spaces',
      'manage_space',
      'get_source_control_config',
      'get_organization',
      'list_access_tokens',
      'get_app',
      'get_resource',
      'get_workflow'
    ])
      expect(keys).toContain(key);
    expect(keys).toHaveLength(32);
  });
  it('retains the unsupported app action input shapes', () => {
    for (const [key, input] of [
      [
        'create_app',
        { appName: 'Synthetic app', folderId: 'app_1', description: 'Existing input' }
      ],
      ['update_app', { appId: 'old-id', appName: 'Synthetic app', folderId: null }]
    ] as const) {
      const action = provider.actions.find(action => action.key === key);
      expect(action?.type).toBe('tool');
      if (action?.type === 'tool')
        expect(action.inputSchema.safeParse(input).success).toBe(true);
    }
  });
  it('preserves legacy optional permission and access-level inputs', () => {
    const action = provider.actions.find(action => action.key === 'list_permissions');
    if (action?.type !== 'tool') throw new Error('Missing retained schema');
    expect(
      action.inputSchema.safeParse({
        direction: 'objects_for_subject',
        subjectType: 'group',
        subjectId: '1'
      }).success
    ).toBe(true);
    const group = provider.actions.find(action => action.key === 'create_group');
    if (group?.type !== 'tool') throw new Error('Missing retained schema');
    expect(
      group.inputSchema.safeParse({
        groupName: 'Synthetic group',
        universalResourceAccess: 'admin',
        universalQueryLibraryAccess: 'own'
      }).success
    ).toBe(true);
  });
});
