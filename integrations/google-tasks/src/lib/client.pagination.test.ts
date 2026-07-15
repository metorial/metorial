import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = vi.hoisted(() => ({
  get: vi.fn()
}));

vi.mock('slates', async () => {
  let actual = await vi.importActual<typeof import('slates')>('slates');
  return {
    ...actual,
    createAxios: vi.fn(() => axiosMocks)
  };
});

import { GoogleTasksClient } from './client';

describe('GoogleTasksClient pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exhausts every task-list page', async () => {
    axiosMocks.get
      .mockResolvedValueOnce({
        data: { items: [{ id: 'list-1' }], nextPageToken: 'lists-page-2' }
      })
      .mockResolvedValueOnce({ data: { items: [{ id: 'list-2' }] } });
    let client = new GoogleTasksClient('test-token');

    await expect(client.getAllTaskLists()).resolves.toEqual([
      { id: 'list-1' },
      { id: 'list-2' }
    ]);
    expect(axiosMocks.get).toHaveBeenNthCalledWith(1, '/users/@me/lists', {
      params: { maxResults: 100, pageToken: undefined }
    });
    expect(axiosMocks.get).toHaveBeenNthCalledWith(2, '/users/@me/lists', {
      params: { maxResults: 100, pageToken: 'lists-page-2' }
    });
  });

  it('exhausts every task page for a list while preserving filters', async () => {
    axiosMocks.get
      .mockResolvedValueOnce({
        data: { items: [{ id: 'task-1' }], nextPageToken: 'tasks-page-2' }
      })
      .mockResolvedValueOnce({ data: { items: [{ id: 'task-2' }] } });
    let client = new GoogleTasksClient('test-token');

    await expect(
      client.getAllTasks('list-1', {
        showCompleted: false,
        updatedMin: '2026-07-01T00:00:00Z'
      })
    ).resolves.toEqual([{ id: 'task-1' }, { id: 'task-2' }]);
    expect(axiosMocks.get).toHaveBeenNthCalledWith(1, '/lists/list-1/tasks', {
      params: {
        showCompleted: false,
        updatedMin: '2026-07-01T00:00:00Z',
        maxResults: 100,
        pageToken: undefined
      }
    });
    expect(axiosMocks.get).toHaveBeenNthCalledWith(2, '/lists/list-1/tasks', {
      params: {
        showCompleted: false,
        updatedMin: '2026-07-01T00:00:00Z',
        maxResults: 100,
        pageToken: 'tasks-page-2'
      }
    });
  });
});
