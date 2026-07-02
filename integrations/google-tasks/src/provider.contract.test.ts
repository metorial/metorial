import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleTasksActionScopes } from './scopes';

describe('google-tasks provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-tasks',
        name: 'Google Tasks',
        description:
          'Create, read, update, and delete task lists and individual tasks in Google Tasks. Supports task hierarchies, ordering, filtering, and incremental sync.'
      },
      toolIds: [
        'list_task_lists',
        'create_task_list',
        'update_task_list',
        'delete_task_list',
        'list_tasks',
        'get_task',
        'create_task',
        'update_task',
        'delete_task',
        'move_task',
        'clear_completed_tasks'
      ],
      triggerIds: ['inbound_webhook', 'task_changes'],
      authMethodIds: ['oauth'],
      tools: [
        { id: 'list_task_lists', readOnly: true, destructive: false },
        { id: 'create_task_list', readOnly: false, destructive: false },
        { id: 'update_task_list', readOnly: false, destructive: false },
        { id: 'delete_task_list', readOnly: false, destructive: true },
        { id: 'list_tasks', readOnly: true, destructive: false },
        { id: 'get_task', readOnly: true, destructive: false },
        { id: 'create_task', readOnly: false, destructive: false },
        { id: 'update_task', readOnly: false, destructive: false },
        { id: 'delete_task', readOnly: false, destructive: true },
        { id: 'move_task', readOnly: false, destructive: false },
        { id: 'clear_completed_tasks', readOnly: false, destructive: true }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'task_changes', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(13);

    let expectedScopes = {
      list_task_lists: googleTasksActionScopes.listTaskLists,
      create_task_list: googleTasksActionScopes.createTaskList,
      update_task_list: googleTasksActionScopes.updateTaskList,
      delete_task_list: googleTasksActionScopes.deleteTaskList,
      list_tasks: googleTasksActionScopes.listTasks,
      get_task: googleTasksActionScopes.getTask,
      create_task: googleTasksActionScopes.createTask,
      update_task: googleTasksActionScopes.updateTask,
      delete_task: googleTasksActionScopes.deleteTask,
      move_task: googleTasksActionScopes.moveTask,
      clear_completed_tasks: googleTasksActionScopes.clearCompletedTasks,
      inbound_webhook: googleTasksActionScopes.inboundWebhook,
      task_changes: googleTasksActionScopes.taskChanges
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map(scope => scope.title)
    );
    expect(scopeTitles.has('Full Access')).toBe(true);
    expect(scopeTitles.has('Read Only')).toBe(true);
  });
});
