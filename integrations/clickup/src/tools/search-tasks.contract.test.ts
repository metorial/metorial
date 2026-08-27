import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provider } from '../index';

let clickUpClientMocks = vi.hoisted(() => ({
  searchTasks: vi.fn(),
  getTasks: vi.fn()
}));

vi.mock('../lib/client', () => ({
  ClickUpClient: class {
    searchTasks(...args: unknown[]) {
      return clickUpClientMocks.searchTasks(...args);
    }

    getTasks(...args: unknown[]) {
      return clickUpClientMocks.getTasks(...args);
    }
  }
}));

let createTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'test-token' }
      }
    }
  });

beforeEach(() => {
  clickUpClientMocks.searchTasks.mockReset();
  clickUpClientMocks.getTasks.mockReset();
});

describe('ClickUp search_tasks Workspace contract', () => {
  it('uses the selected Workspace when listId constrains the search', async () => {
    clickUpClientMocks.searchTasks.mockResolvedValue({ tasks: [] });

    let result = await createTestClient().invokeTool('search_tasks', {
      workspaceId: 'selected-workspace',
      listId: 'list-1'
    });

    expect(result.output).toEqual({ tasks: [] });
    expect(clickUpClientMocks.searchTasks).toHaveBeenCalledWith(
      'selected-workspace',
      expect.objectContaining({ listIds: ['list-1'] })
    );
    expect(clickUpClientMocks.getTasks).not.toHaveBeenCalled();
  });
});
