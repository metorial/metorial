import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  getAllTaskLists: vi.fn(),
  getAllTasks: vi.fn()
}));

vi.mock('./lib/client', () => ({
  GoogleTasksClient: class {
    getAllTaskLists(...args: unknown[]) {
      return clientMocks.getAllTaskLists(...args);
    }

    getAllTasks(...args: unknown[]) {
      return clientMocks.getAllTasks(...args);
    }
  }
}));

import { provider } from './index';

let createGoogleTasksToolTestClient = () =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'test-token' }
      }
    }
  });

describe('Google Tasks list_tasks behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves single-list calls without enumerating task lists', async () => {
    clientMocks.getAllTasks.mockResolvedValue([
      { id: 'task-1', title: 'Existing call', status: 'needsAction' }
    ]);
    let client = createGoogleTasksToolTestClient();

    let result = await client.invokeTool('list_tasks', {
      taskListId: 'list-1',
      showCompleted: false
    });

    expect(clientMocks.getAllTaskLists).not.toHaveBeenCalled();
    expect(clientMocks.getAllTasks).toHaveBeenCalledWith('list-1', {
      showCompleted: false,
      showDeleted: undefined,
      showHidden: undefined,
      dueMin: undefined,
      dueMax: undefined,
      completedMin: undefined,
      completedMax: undefined,
      updatedMin: undefined
    });
    expect(result.output.tasks).toEqual([
      expect.objectContaining({
        taskId: 'task-1',
        taskListId: 'list-1',
        title: 'Existing call'
      })
    ]);
  });

  it.each([
    '',
    '   '
  ])('rejects the empty or whitespace-only taskListId %j before calling Google', async taskListId => {
    let client = createGoogleTasksToolTestClient();

    await expectSlateError(
      () => client.invokeTool('list_tasks', { taskListId }),
      'taskListId must be a non-empty task list ID; omit it to list tasks across all task lists'
    );
    expect(clientMocks.getAllTaskLists).not.toHaveBeenCalled();
    expect(clientMocks.getAllTasks).not.toHaveBeenCalled();
  });

  it('lists every task list and tags each task with its list context', async () => {
    clientMocks.getAllTaskLists.mockResolvedValue([
      { id: 'list-1', title: 'Work' },
      { id: 'list-2', title: 'Personal' }
    ]);
    clientMocks.getAllTasks.mockImplementation(async (taskListId: string) =>
      taskListId === 'list-1'
        ? [{ id: 'task-1', title: 'Plan launch' }]
        : [{ id: 'task-2', title: 'Buy milk' }]
    );
    let client = createGoogleTasksToolTestClient();

    let result = await client.invokeTool('list_tasks', {});

    expect(clientMocks.getAllTaskLists).toHaveBeenCalledOnce();
    expect(clientMocks.getAllTasks).toHaveBeenCalledTimes(2);
    expect(clientMocks.getAllTasks.mock.calls.map(([taskListId]) => taskListId)).toEqual([
      'list-1',
      'list-2'
    ]);
    expect(result.output.tasks).toEqual([
      expect.objectContaining({
        taskId: 'task-1',
        taskListId: 'list-1',
        taskListTitle: 'Work'
      }),
      expect.objectContaining({
        taskId: 'task-2',
        taskListId: 'list-2',
        taskListTitle: 'Personal'
      })
    ]);
    expect(result.message).toContain('across **2** task list(s)');
  });

  it('converts upstream failures to a Google Tasks ServiceError', async () => {
    clientMocks.getAllTaskLists.mockRejectedValue(new Error('request failed'));
    let client = createGoogleTasksToolTestClient();

    await expectSlateError(
      () => client.invokeTool('list_tasks', {}),
      'Google Tasks API list tasks failed: request failed'
    );
  });
});
