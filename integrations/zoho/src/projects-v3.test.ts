import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type RequestCall = {
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string;
  body?: unknown;
  config?: unknown;
};

let http = vi.hoisted(() => ({
  configs: [] as Record<string, any>[],
  calls: [] as RequestCall[],
  responses: [] as unknown[]
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  let response = () => Promise.resolve({ data: http.responses.shift() });

  return {
    ...actual,
    createAxios: vi.fn((config: Record<string, any>) => {
      http.configs.push(config);
      return {
        defaults: { headers: { common: {} } },
        interceptors: { response: { use: vi.fn() } },
        get: vi.fn((path: string, requestConfig?: unknown) => {
          http.calls.push({ method: 'get', path, config: requestConfig });
          return response();
        }),
        post: vi.fn((path: string, body?: unknown, requestConfig?: unknown) => {
          http.calls.push({ method: 'post', path, body, config: requestConfig });
          return response();
        }),
        patch: vi.fn((path: string, body?: unknown, requestConfig?: unknown) => {
          http.calls.push({ method: 'patch', path, body, config: requestConfig });
          return response();
        }),
        delete: vi.fn((path: string, requestConfig?: unknown) => {
          http.calls.push({ method: 'delete', path, config: requestConfig });
          return response();
        })
      };
    })
  };
});

import { projectsGetPortals } from './tools/projects-get-portals';
import { projectsManageProject } from './tools/projects-manage-project';
import { projectsManageTask } from './tools/projects-manage-task';

let canonicalAuth = {
  token: 'access-token',
  region: 'eu',
  accountsUrl: 'https://accounts.zoho.eu',
  apiDomain: 'https://www.zohoapis.eu'
};

let invoke = (tool: any, input: Record<string, unknown>) =>
  tool.handleInvocation({ auth: canonicalAuth, input } as any);

let queue = (...responses: unknown[]) => http.responses.push(...responses);

beforeEach(() => {
  http.configs.length = 0;
  http.calls.length = 0;
  http.responses.length = 0;
});

describe('Zoho Projects V3 routing and response mapping', () => {
  it('lists portals through the provider-returned API domain', async () => {
    queue([
      {
        id: 123,
        portal_name: 'Example Portal',
        profile: { name: 'Portal Owner' }
      }
    ]);

    let result = await invoke(projectsGetPortals, {});

    expect(http.configs[0]).toMatchObject({
      baseURL: 'https://projectsapi.zoho.eu/api/v3',
      headers: { Authorization: 'Bearer access-token' }
    });
    expect(http.calls).toEqual([{ method: 'get', path: '/portals', config: undefined }]);
    expect(result.output.portals).toEqual([
      { portalId: '123', name: 'Example Portal', role: 'Portal Owner' }
    ]);
  });

  it('maps offset pagination and status aliases onto V3 project lists', async () => {
    queue([{ id: 'project-1', name: 'First project' }]);

    let result = await invoke(projectsManageProject, {
      portalId: 'portal-1',
      action: 'list',
      index: 21,
      range: 10,
      status: 'active'
    });

    expect(http.configs[0]).toMatchObject({
      baseURL: 'https://projectsapi.zoho.eu/api/v3/portal/portal-1',
      headers: {
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json'
      }
    });
    expect(http.calls[0]).toMatchObject({
      method: 'get',
      path: '/projects',
      config: {
        params: {
          page: 3,
          per_page: 10
        }
      }
    });
    expect(JSON.parse((http.calls[0]!.config as any).params.filter)).toEqual({
      criteria: [
        {
          field_name: 'status',
          criteria_condition: 'all_open'
        }
      ],
      pattern: '1'
    });
    expect(result.output.projects).toEqual([{ id: 'project-1', name: 'First project' }]);
  });

  it('uses V3 JSON payloads and direct-object responses for project mutations', async () => {
    queue(
      { id: 'project-1', name: 'Created project' },
      { id: 'project-1', description: 'Updated project' },
      { id: 'project-1', name: 'Fetched project' },
      undefined
    );

    let created = await invoke(projectsManageProject, {
      portalId: 'portal-1',
      action: 'create',
      name: 'Created project',
      description: 'Description',
      status: 'status-1',
      startDate: '12-20-2023',
      endDate: '12-21-2023',
      ownerId: 'zpuid-1'
    });
    let updated = await invoke(projectsManageProject, {
      portalId: 'portal-1',
      action: 'update',
      projectId: 'project-1',
      description: 'Updated project'
    });
    let fetched = await invoke(projectsManageProject, {
      portalId: 'portal-1',
      action: 'get',
      projectId: 'project-1'
    });
    let deleted = await invoke(projectsManageProject, {
      portalId: 'portal-1',
      action: 'delete',
      projectId: 'project-1'
    });

    expect(http.calls).toEqual([
      {
        method: 'post',
        path: '/projects',
        body: {
          name: 'Created project',
          description: 'Description',
          status: { id: 'status-1' },
          start_date: '2023-12-20',
          end_date: '2023-12-21',
          owner: { zpuid: 'zpuid-1' }
        },
        config: undefined
      },
      {
        method: 'patch',
        path: '/projects/project-1',
        body: { description: 'Updated project' },
        config: undefined
      },
      { method: 'get', path: '/projects/project-1', config: undefined },
      { method: 'delete', path: '/projects/project-1', config: undefined }
    ]);
    expect(created.output.project).toMatchObject({ id: 'project-1' });
    expect(updated.output.project).toMatchObject({ description: 'Updated project' });
    expect(fetched.output.project).toMatchObject({ name: 'Fetched project' });
    expect(deleted.output.deleted).toBe(true);
  });

  it('uses V3 task and phase routes while preserving tool output wrappers', async () => {
    queue(
      { tasks: [{ id: 'task-1' }] },
      { milestones: [{ id: 'phase-1', name: 'Milestone one' }] },
      { id: 'task-2', name: 'Created task' },
      { id: 'task-2', completion_percentage: 10 },
      { id: 'task-2', name: 'Created task', completion_percentage: 10 },
      undefined
    );

    let listedTasks = await invoke(projectsManageProject, {
      portalId: 'portal-1',
      projectId: 'project-1',
      action: 'list_tasks',
      index: 1,
      range: 25,
      status: 'status-1'
    });
    let listedMilestones = await invoke(projectsManageProject, {
      portalId: 'portal-1',
      projectId: 'project-1',
      action: 'list_milestones',
      range: 25
    });
    let created = await invoke(projectsManageTask, {
      portalId: 'portal-1',
      projectId: 'project-1',
      action: 'create',
      name: 'Created task',
      description: 'Description',
      startDate: '01-02-2024',
      endDate: '2024-01-03T12:00:00.000Z',
      priority: 'High',
      status: 'status-2',
      owners: 'zpuid-1, zpuid-2',
      percentComplete: 0
    });
    let updated = await invoke(projectsManageTask, {
      portalId: 'portal-1',
      projectId: 'project-1',
      action: 'update',
      taskId: 'task-2',
      percentComplete: 10
    });
    let fetched = await invoke(projectsManageTask, {
      portalId: 'portal-1',
      projectId: 'project-1',
      action: 'get',
      taskId: 'task-2'
    });
    let deleted = await invoke(projectsManageTask, {
      portalId: 'portal-1',
      projectId: 'project-1',
      action: 'delete',
      taskId: 'task-2'
    });

    expect(http.calls[0]).toMatchObject({
      method: 'get',
      path: '/projects/project-1/tasks',
      config: { params: { page: 1, per_page: 25 } }
    });
    expect(JSON.parse((http.calls[0]!.config as any).params.filter)).toMatchObject({
      criteria: [{ criteria_condition: 'is', value: ['status-1'] }]
    });
    expect(http.calls[1]).toMatchObject({
      method: 'get',
      path: '/projects/project-1/phases',
      config: { params: { per_page: 25 } }
    });
    expect(http.calls[2]).toEqual({
      method: 'post',
      path: '/projects/project-1/tasks',
      body: {
        name: 'Created task',
        description: 'Description',
        start_date: '2024-01-02T00:00:00.000Z',
        end_date: '2024-01-03T12:00:00.000Z',
        priority: 'high',
        status: { id: 'status-2' },
        owners_and_work: {
          owners: [{ zpuid: 'zpuid-1' }, { zpuid: 'zpuid-2' }]
        },
        completion_percentage: 0
      },
      config: undefined
    });
    expect(http.calls.slice(3)).toEqual([
      {
        method: 'patch',
        path: '/projects/project-1/tasks/task-2',
        body: { completion_percentage: 10 },
        config: undefined
      },
      {
        method: 'get',
        path: '/projects/project-1/tasks/task-2',
        config: undefined
      },
      {
        method: 'delete',
        path: '/projects/project-1/tasks/task-2',
        config: undefined
      }
    ]);
    expect(listedTasks.output.tasks).toEqual([{ id: 'task-1' }]);
    expect(listedMilestones.output.milestones).toEqual([
      { id: 'phase-1', name: 'Milestone one' }
    ]);
    expect(created.output.task).toMatchObject({ id: 'task-2' });
    expect(updated.output.task).toMatchObject({ completion_percentage: 10 });
    expect(fetched.output.task).toMatchObject({ name: 'Created task' });
    expect(deleted.output.deleted).toBe(true);
    expect(JSON.stringify({ configs: http.configs, calls: http.calls })).not.toContain(
      '/restapi'
    );
  });

  it('uses only the documented module-specific V3 list filters', async () => {
    queue([], [], [], [], []);

    await invoke(projectsManageProject, {
      portalId: 'portal-1',
      action: 'list',
      status: 'all'
    });
    await invoke(projectsManageProject, {
      portalId: 'portal-1',
      projectId: 'project-1',
      action: 'list_tasks',
      status: 'completed'
    });
    await invoke(projectsManageProject, {
      portalId: 'portal-1',
      projectId: 'project-1',
      action: 'list_tasks',
      status: 'notcompleted'
    });
    await invoke(projectsManageProject, {
      portalId: 'portal-1',
      projectId: 'project-1',
      action: 'list_tasks',
      status: 'active'
    });
    await invoke(projectsManageProject, {
      portalId: 'portal-1',
      projectId: 'project-1',
      action: 'list_milestones',
      status: 'phase-status-1'
    });

    expect((http.calls[0]!.config as any).params.filter).toBeUndefined();
    expect(JSON.parse((http.calls[1]!.config as any).params.filter)).toEqual({
      criteria: [
        {
          field_name: 'is_completed',
          criteria_condition: 'is',
          value: ['true']
        }
      ],
      pattern: '1'
    });
    expect(JSON.parse((http.calls[2]!.config as any).params.filter)).toEqual({
      criteria: [
        {
          field_name: 'is_completed',
          criteria_condition: 'is',
          value: ['false']
        }
      ],
      pattern: '1'
    });
    expect(JSON.parse((http.calls[3]!.config as any).params.filter)).toEqual({
      criteria: [
        {
          field_name: 'status',
          criteria_condition: 'is',
          value: ['active']
        }
      ],
      pattern: '1'
    });
    expect(JSON.parse((http.calls[4]!.config as any).params.filter)).toEqual({
      criteria: [
        {
          field_name: 'status',
          criteria_condition: 'is',
          value: ['phase-status-1']
        }
      ],
      pattern: '1'
    });
  });

  it('rejects legacy list filters without verified V3 equivalents', async () => {
    await expect(
      invoke(projectsManageProject, {
        portalId: 'portal-1',
        action: 'list',
        status: 'template'
      })
    ).rejects.toBeInstanceOf(ServiceError);
    await expect(
      invoke(projectsManageProject, {
        portalId: 'portal-1',
        projectId: 'project-1',
        action: 'list_milestones',
        status: 'completed'
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(http.calls).toHaveLength(0);
  });

  it('rejects a Projects request when apiDomain is not canonical', async () => {
    await expect(
      projectsManageProject.handleInvocation({
        auth: { ...canonicalAuth, apiDomain: 'https://attacker.example' },
        input: { portalId: 'portal-1', action: 'list' }
      } as any)
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it.each([
    ['sa', 'https://accounts.zoho.sa', 'https://www.zohoapis.sa'],
    ['uk', 'https://accounts.zoho.uk', 'https://www.zohoapis.uk']
  ])('fails closed before HTTP when Projects V3 is unqualified in %s', async (region, accountsUrl, apiDomain) => {
    await expect(
      projectsGetPortals.handleInvocation({
        auth: { ...canonicalAuth, region, accountsUrl, apiDomain },
        input: {}
      } as any)
    ).rejects.toBeInstanceOf(ServiceError);
    expect(http.configs).toHaveLength(0);
    expect(http.calls).toHaveLength(0);
  });
});
