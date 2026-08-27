import { beforeEach, describe, expect, it, vi } from 'vitest';

type CreateAxiosConfig = {
  baseURL?: string;
  headers?: Record<string, string>;
};

let httpMocks = vi.hoisted(() => {
  let http = {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      response: {
        use: vi.fn()
      }
    }
  };

  return {
    ...http,
    createAxios: vi.fn((_config: CreateAxiosConfig) => http)
  };
});

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  return { ...actual, createAxios: httpMocks.createAxios };
});

import { Client } from './client';

let getOptFields = (callIndex: number) => {
  let config = httpMocks.get.mock.calls[callIndex]?.[1] as
    | { params?: { opt_fields?: string } }
    | undefined;
  return config?.params?.opt_fields?.split(',');
};

describe('Asana client request construction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    httpMocks.get.mockResolvedValue({ data: { data: {} } });
    httpMocks.post.mockResolvedValue({ data: { data: {} } });
  });

  it('configures bearer authorization without inheriting a JSON content type', () => {
    new Client({ token: 'test-token' });

    expect(httpMocks.createAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://app.asana.com/api/1.0',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token'
        })
      })
    );
    expect(httpMocks.createAxios.mock.calls[0]?.[0]?.headers).not.toHaveProperty(
      'Content-Type'
    );
  });

  it('omits current_status from project list and get requests', async () => {
    let client = new Client({ token: 'test-token' });

    await client.listProjects('workspace-123');
    await client.getProject('project-123');

    expect(httpMocks.get.mock.calls[0]?.[0]).toBe('/workspaces/workspace-123/projects');
    expect(getOptFields(0)).toEqual(expect.arrayContaining(['name', 'workspace']));
    expect(getOptFields(0)).not.toContain('current_status');
    expect(httpMocks.get.mock.calls[1]?.[0]).toBe('/projects/project-123');
    expect(getOptFields(1)).toEqual(expect.arrayContaining(['name', 'members']));
    expect(getOptFields(1)).not.toContain('current_status');
  });

  it('omits unsupported status-update and like fields from goal list and get requests', async () => {
    let client = new Client({ token: 'test-token' });

    await client.listGoals({ workspaceId: 'workspace-123' });
    await client.getGoal('goal-123');

    expect(httpMocks.get.mock.calls[0]?.[0]).toBe('/goals');
    expect(getOptFields(0)).toEqual(expect.arrayContaining(['name', 'status']));
    expect(httpMocks.get.mock.calls[1]?.[0]).toBe('/goals/goal-123');
    expect(getOptFields(1)).toEqual(expect.arrayContaining(['name', 'metric']));
    for (let forbiddenField of ['current_status_update', 'liked', 'likes']) {
      expect(getOptFields(0)).not.toContain(forbiddenField);
      expect(getOptFields(1)).not.toContain(forbiddenField);
    }
  });

  it('uses workspace only as a project-template list filter, not an opt field', async () => {
    let client = new Client({ token: 'test-token' });

    await client.listProjectTemplates({ workspaceId: 'workspace-123' });
    await client.getProjectTemplate('template-123');

    let listConfig = httpMocks.get.mock.calls[0]?.[1] as
      | { params?: Record<string, unknown> }
      | undefined;
    expect(httpMocks.get.mock.calls[0]?.[0]).toBe('/project_templates');
    expect(listConfig?.params).toMatchObject({ workspace: 'workspace-123' });
    expect(getOptFields(0)).toEqual(expect.arrayContaining(['name', 'team']));
    expect(getOptFields(0)).not.toContain('workspace');
    expect(httpMocks.get.mock.calls[1]?.[0]).toBe('/project_templates/template-123');
    expect(getOptFields(1)).toEqual(expect.arrayContaining(['name', 'team']));
    expect(getOptFields(1)).not.toContain('workspace');
  });

  it('posts attachment FormData without an inherited JSON content type', async () => {
    let client = new Client({ token: 'test-token' });

    await client.createExternalAttachment({
      parentId: 'task-123',
      url: 'https://example.com/report.pdf',
      name: 'report.pdf'
    });

    let [path, body, requestConfig] = httpMocks.post.mock.calls[0] ?? [];
    let form = body as FormData;
    let clientConfig = httpMocks.createAxios.mock.calls[0]?.[0];

    expect(path).toBe('/attachments');
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('parent')).toBe('task-123');
    expect(form.get('resource_subtype')).toBe('external');
    expect(form.get('url')).toBe('https://example.com/report.pdf');
    expect(form.get('name')).toBe('report.pdf');
    expect(requestConfig).toBeUndefined();
    expect(clientConfig).toBeDefined();
    expect(clientConfig?.headers).not.toHaveProperty('Content-Type');
  });
});
