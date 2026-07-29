import { expectMcpCompatibleToolSchema } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { GitHubClient } from './lib/client';
import { GitHubProjectsApi } from './lib/github-projects';
import { projectsGet } from './tools/projects-get';
import { projectsList } from './tools/projects-list';
import { projectsWrite } from './tools/projects-write';

let tools = [projectsList, projectsGet, projectsWrite];
let schema = (tool: any) => z.toJSONSchema(tool.inputSchema) as any;
let invoke = (tool: any, input: Record<string, unknown>) =>
  tool.handleInvocation({
    auth: { token: 'test-token', instanceUrl: 'https://github.com' },
    config: {},
    input
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GitHub Projects synced tool schemas', () => {
  it('keeps all three schemas MCP-compatible and production IDs below 60 characters', () => {
    for (let tool of tools) {
      expectMcpCompatibleToolSchema(tool);
      expect(`github-${tool.key}`.length).toBeLessThan(60);
    }
  });

  it('matches the official projects_list contract', () => {
    let input = schema(projectsList);
    expect(Object.keys(input.properties)).toEqual([
      'method',
      'owner_type',
      'owner',
      'project_number',
      'query',
      'fields',
      'field_names',
      'per_page',
      'after',
      'before'
    ]);
    expect(input.required).toEqual(['method', 'owner']);
    expect(input.properties.method.enum).toEqual([
      'list_projects',
      'list_project_fields',
      'list_project_items',
      'list_project_status_updates'
    ]);
    expect(input.properties.owner_type.enum).toEqual(['user', 'org']);
    expect(input.properties.per_page).not.toHaveProperty('maximum');
  });

  it('matches the official projects_get contract', () => {
    let input = schema(projectsGet);
    expect(Object.keys(input.properties)).toEqual([
      'method',
      'owner_type',
      'owner',
      'project_number',
      'field_id',
      'item_id',
      'fields',
      'field_names',
      'status_update_id'
    ]);
    expect(input.required).toEqual(['method']);
    expect(input.properties.method.enum).toEqual([
      'get_project',
      'get_project_field',
      'get_project_item',
      'get_project_status_update'
    ]);
  });

  it('matches the official projects_write contract', () => {
    let input = schema(projectsWrite);
    expect(Object.keys(input.properties)).toEqual([
      'method',
      'owner_type',
      'owner',
      'project_number',
      'title',
      'item_id',
      'item_type',
      'item_owner',
      'item_repo',
      'issue_number',
      'pull_request_number',
      'updated_field',
      'body',
      'status',
      'start_date',
      'target_date',
      'field_name',
      'iteration_duration',
      'iterations'
    ]);
    expect(input.required).toEqual(['method', 'owner']);
    expect(input.properties.method.enum).toEqual([
      'add_project_item',
      'create_iteration_field',
      'create_project',
      'create_project_status_update',
      'delete_project_item',
      'update_project_item'
    ]);
    expect(input.properties.status.enum).toEqual([
      'AT_RISK',
      'COMPLETE',
      'INACTIVE',
      'OFF_TRACK',
      'ON_TRACK'
    ]);
    expect(input.properties.iterations.items.required).toEqual([
      'title',
      'start_date',
      'duration'
    ]);
    const { description: _description, ...updatedFieldSchema } =
      input.properties.updated_field;
    expect(updatedFieldSchema).toEqual({ type: 'object' });
    expect(() =>
      projectsWrite.inputSchema.parse({
        method: 'update_project_item',
        owner: 'octo-org',
        updated_field: []
      })
    ).toThrow('updated_field must be an object');
  });
});

describe('GitHub Projects tool routing and validation', () => {
  it('routes list item field-name selection and returns the resolved owner type', async () => {
    let list = vi.spyOn(GitHubProjectsApi.prototype, 'listProjectItems').mockResolvedValue({
      ownerType: 'org',
      value: {
        items: [{ id: 41, content: { title: 'Ship it' } }],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          nextCursor: 'next-page'
        }
      }
    });

    let result = await invoke(projectsList, {
      method: 'list_project_items',
      owner: 'octo-org',
      project_number: 7,
      field_names: ['Status'],
      per_page: 20,
      after: 'next'
    });

    expect(list).toHaveBeenCalledWith('octo-org', undefined, 7, {
      query: undefined,
      fields: undefined,
      fieldNames: ['Status'],
      perPage: 20,
      after: 'next',
      before: undefined
    });
    expect(result.output).toMatchObject({
      method: 'list_project_items',
      ownerType: 'org',
      result: {
        items: [{ id: 41 }],
        pageInfo: {
          hasNextPage: true,
          hasPreviousPage: false,
          nextCursor: 'next-page'
        }
      }
    });
  });

  it('gets a status update without requiring owner or project_number', async () => {
    vi.spyOn(GitHubProjectsApi.prototype, 'getProjectStatusUpdate').mockResolvedValue({
      id: 'PVTSU_1',
      status: 'ON_TRACK'
    });

    let result = await invoke(projectsGet, {
      method: 'get_project_status_update',
      status_update_id: 'PVTSU_1'
    });

    expect(result.output).toEqual({
      method: 'get_project_status_update',
      owner: null,
      ownerType: null,
      result: { id: 'PVTSU_1', status: 'ON_TRACK' }
    });
  });

  it('enforces method-specific requirements with ServiceError-compatible errors', async () => {
    await expect(
      invoke(projectsList, {
        method: 'list_project_items',
        owner: 'octocat',
        fields: ['1'],
        field_names: ['Status']
      })
    ).rejects.toThrow("Provide either 'fields' or 'field_names', not both.");

    await expect(
      invoke(projectsGet, {
        method: 'get_project',
        owner: 'octocat'
      })
    ).rejects.toThrow('get_project requires owner and a positive project_number.');

    await expect(
      invoke(projectsWrite, {
        method: 'create_project',
        owner: 'octocat',
        title: 'Roadmap'
      })
    ).rejects.toThrow("owner_type is required for 'create_project'.");

    await expect(
      invoke(projectsWrite, {
        method: 'create_iteration_field',
        owner: 'octocat',
        project_number: 4,
        field_name: 'Sprint',
        start_date: '2026-08-03',
        iteration_duration: 14,
        iterations: [{ title: 'Sprint 1', start_date: '2026-08-03', duration: 0 }]
      })
    ).rejects.toThrow(
      'iterations[0] requires a non-empty title and positive integer duration.'
    );
  });

  it('routes create_project and add_project_item through the Projects helper', async () => {
    let create = vi.spyOn(GitHubProjectsApi.prototype, 'createProject').mockResolvedValue({
      id: 'PVT_1',
      number: 1,
      title: 'Roadmap'
    });
    let add = vi.spyOn(GitHubProjectsApi.prototype, 'addProjectItem').mockResolvedValue({
      ownerType: 'org',
      value: { id: 'PVTI_1', fullDatabaseId: '17' }
    });

    await invoke(projectsWrite, {
      method: 'create_project',
      owner: 'octo-org',
      owner_type: 'org',
      title: 'Roadmap'
    });
    await invoke(projectsWrite, {
      method: 'add_project_item',
      owner: 'octo-org',
      owner_type: 'org',
      project_number: 2,
      item_type: 'pull_request',
      item_owner: 'octocat',
      item_repo: 'hello-world',
      pull_request_number: 9
    });

    expect(create).toHaveBeenCalledWith('octo-org', 'org', 'Roadmap');
    expect(add).toHaveBeenCalledWith('octo-org', 'org', 2, {
      type: 'pull_request',
      owner: 'octocat',
      repo: 'hello-world',
      number: 9
    });
  });

  it('preserves arbitrary updated_field data while routing an item update', async () => {
    const update = vi
      .spyOn(GitHubProjectsApi.prototype, 'updateProjectItem')
      .mockResolvedValue({
        ownerType: 'org',
        value: { id: 17 }
      });
    const updatedField = {
      id: 42,
      value: { iterationId: 'iteration-1', nested: [true, null, 7] },
      futureProviderOption: 'preserved'
    };

    await invoke(projectsWrite, {
      method: 'update_project_item',
      owner: 'octo-org',
      owner_type: 'org',
      project_number: 2,
      item_id: 17,
      updated_field: updatedField
    });

    expect(update).toHaveBeenCalledWith('octo-org', 'org', 2, {
      itemId: 17,
      issue: undefined,
      updatedField
    });
  });
});

describe('GitHub Projects provider requests', () => {
  it('uses the versioned Projects REST routes and caps page size at the upstream limit', async () => {
    let requestRestWithMetadata = vi
      .spyOn(GitHubClient.prototype, 'requestRestWithMetadata')
      .mockResolvedValue({
        data: [],
        linkHeader:
          '<https://api.github.com/orgs/octo-org/projectsV2/3/items?after=next-page>; rel="next"'
      });
    let requestRest = vi.spyOn(GitHubClient.prototype, 'requestRest').mockResolvedValue({});
    let api = new GitHubProjectsApi({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });

    let listed = await api.listProjectItems('octo org', 'org', 3, {
      fields: ['12', '34'],
      query: 'is:open',
      perPage: 100,
      before: 'previous'
    });
    await api.getProjectField('octocat', 'user', 3, 42);

    expect(requestRestWithMetadata.mock.calls[0]?.[0]).toMatchObject({
      method: 'GET',
      path: '/orgs/octo%20org/projectsV2/3/items',
      query: {
        q: 'is:open',
        fields: '12,34',
        per_page: 50,
        before: 'previous'
      },
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10'
      }
    });
    expect(listed.value.pageInfo).toEqual({
      hasNextPage: true,
      hasPreviousPage: false,
      nextCursor: 'next-page'
    });
    expect(requestRest.mock.calls[0]?.[0]).toMatchObject({
      path: '/users/octocat/projectsV2/3/fields/42'
    });
  });

  it('resolves a named single-select option before updating an item', async () => {
    vi.spyOn(GitHubClient.prototype, 'requestRestWithMetadata').mockResolvedValueOnce({
      data: [
        {
          id: 5,
          name: 'Status',
          data_type: 'single_select',
          options: [
            { id: 'todo', name: { raw: 'Todo' } },
            { id: 'progress', name: { raw: 'In Progress' } }
          ]
        }
      ],
      linkHeader: undefined
    });
    let requestRest = vi.spyOn(GitHubClient.prototype, 'requestRest').mockResolvedValueOnce({
      id: 17
    });
    let api = new GitHubProjectsApi({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });

    await api.updateProjectItem('octo-org', 'org', 2, {
      itemId: 17,
      updatedField: { name: 'status', value: 'in progress' }
    });

    expect(requestRest.mock.calls[0]?.[0]).toMatchObject({
      method: 'PATCH',
      path: '/orgs/octo-org/projectsV2/2/items/17',
      body: { fields: [{ id: 5, value: 'progress' }] }
    });
  });

  it('returns official cursor names for project status updates', async () => {
    vi.spyOn(GitHubClient.prototype, 'requestGraphQL').mockResolvedValue({
      organization: {
        projectV2: {
          statusUpdates: {
            nodes: [{ id: 'PVTSU_1', status: 'ON_TRACK' }],
            pageInfo: {
              hasNextPage: true,
              hasPreviousPage: true,
              endCursor: 'next-status',
              startCursor: 'previous-status'
            }
          }
        }
      }
    });
    let api = new GitHubProjectsApi({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });

    let result = await api.listProjectStatusUpdates('octo-org', 'org', 4);

    expect(result.value).toEqual({
      statusUpdates: [{ id: 'PVTSU_1', status: 'ON_TRACK' }],
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: true,
        nextCursor: 'next-status',
        prevCursor: 'previous-status'
      }
    });
  });

  it('creates and configures iteration fields with the official two-step GraphQL flow', async () => {
    let requestGraphQL = vi
      .spyOn(GitHubClient.prototype, 'requestGraphQL')
      .mockResolvedValueOnce({
        organization: { projectV2: { id: 'PVT_4' } }
      })
      .mockResolvedValueOnce({
        createProjectV2Field: {
          projectV2Field: { id: 'PVTF_19', name: 'Sprint' }
        }
      })
      .mockResolvedValueOnce({
        updateProjectV2Field: {
          projectV2Field: {
            id: 'PVTF_19',
            name: 'Sprint',
            configuration: {
              iterations: [
                {
                  id: 'PVTI_1',
                  title: 'Sprint 1',
                  startDate: '2026-08-03',
                  duration: 14
                }
              ]
            }
          }
        }
      });
    let api = new GitHubProjectsApi({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });

    let result = await api.createIterationField('octo-org', 'org', 4, {
      name: 'Sprint',
      startDate: '2026-08-03',
      duration: 14,
      iterations: [{ title: 'Sprint 1', start_date: '2026-08-03', duration: 14 }]
    });

    expect(requestGraphQL.mock.calls[0]?.[1]).toEqual({
      owner: 'octo-org',
      projectNumber: 4
    });
    expect(requestGraphQL.mock.calls[1]?.[1]).toEqual({
      input: {
        projectId: 'PVT_4',
        dataType: 'ITERATION',
        name: 'Sprint'
      }
    });
    expect(requestGraphQL.mock.calls[2]?.[1]).toEqual({
      input: {
        fieldId: 'PVTF_19',
        iterationConfiguration: {
          startDate: '2026-08-03',
          duration: 14,
          iterations: [
            {
              title: 'Sprint 1',
              startDate: '2026-08-03',
              duration: 14
            }
          ]
        }
      }
    });
    expect(result).toEqual({
      ownerType: 'org',
      value: {
        id: 'PVTF_19',
        name: 'Sprint',
        configuration: {
          iterations: [
            {
              id: 'PVTI_1',
              title: 'Sprint 1',
              startDate: '2026-08-03',
              duration: 14
            }
          ]
        }
      }
    });
  });

  it('reports the created field when iteration configuration fails', async () => {
    vi.spyOn(GitHubClient.prototype, 'requestGraphQL')
      .mockResolvedValueOnce({
        organization: { projectV2: { id: 'PVT_4' } }
      })
      .mockResolvedValueOnce({
        createProjectV2Field: {
          projectV2Field: { id: 'PVTF_19', name: 'Sprint' }
        }
      })
      .mockRejectedValueOnce(new Error('configuration rejected'));
    let api = new GitHubProjectsApi({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });

    await expect(
      api.createIterationField('octo-org', 'org', 4, {
        name: 'Sprint',
        startDate: '2026-08-03',
        duration: 14
      })
    ).rejects.toThrow(
      'GitHub created iteration field "Sprint" (PVTF_19) but could not configure its schedule.'
    );
  });
});
