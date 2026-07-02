import { afterEach, describe, expect, it, vi } from 'vitest';

let request = vi.fn();

let loadClient = async () => {
  vi.resetModules();
  request.mockReset();

  vi.doMock('@slates/provider', async importOriginal => {
    let actual = await importOriginal<typeof import('@slates/provider')>();

    return {
      ...actual,
      createAxios: vi.fn(() => ({
        request
      }))
    };
  });

  let { resolveFabricRuntimeConfig } = await import('../config');
  let { FabricClient } = await import('./client');

  return new FabricClient({
    token: 'test-token',
    config: resolveFabricRuntimeConfig()
  });
};

afterEach(() => {
  vi.doUnmock('@slates/provider');
  vi.resetModules();
});

describe('Microsoft Fabric client request contract', () => {
  it('lists Data Pipelines with the documented optional folder filters', async () => {
    let client = await loadClient();
    request.mockResolvedValueOnce({
      status: 200,
      data: { value: [] },
      headers: {}
    });

    await client.listDataPipelines({
      workspaceId: 'workspace-1',
      continuationToken: 'next-page',
      recursive: false,
      rootFolderId: 'folder-1'
    });

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      url: '/workspaces/workspace-1/dataPipelines',
      params: {
        continuationToken: 'next-page',
        recursive: false,
        rootFolderId: 'folder-1'
      }
    });
  });

  it('lists Dataflows with the documented optional folder filters', async () => {
    let client = await loadClient();
    request.mockResolvedValueOnce({
      status: 200,
      data: { value: [] },
      headers: {}
    });

    await client.listDataflows({
      workspaceId: 'workspace-1',
      continuationToken: 'next-page',
      recursive: true,
      rootFolderId: 'folder-1'
    });

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      url: '/workspaces/workspace-1/dataflows',
      params: {
        continuationToken: 'next-page',
        recursive: true,
        rootFolderId: 'folder-1'
      }
    });
  });

  it('runs Data Pipelines through the generic Fabric item job scheduler endpoint', async () => {
    let client = await loadClient();
    request.mockResolvedValueOnce({
      status: 202,
      statusText: 'Accepted',
      data: {},
      headers: {
        Location:
          'https://api.fabric.microsoft.com/v1/workspaces/workspace-1/items/pipeline-1/jobs/instances/job-1',
        'Retry-After': '60'
      }
    });

    let result = await client.runDataPipeline({
      workspaceId: 'workspace-1',
      pipelineId: 'pipeline-1'
    });

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      url: '/workspaces/workspace-1/items/pipeline-1/jobs/DefaultJob/instances',
      data: undefined
    });
    expect(result.operation).toEqual({
      status: 202,
      statusText: 'Accepted',
      location:
        'https://api.fabric.microsoft.com/v1/workspaces/workspace-1/items/pipeline-1/jobs/instances/job-1',
      operationId: undefined,
      retryAfter: '60'
    });
  });

  it('sends optional job execution data and parameters only when provided', async () => {
    let client = await loadClient();
    request.mockResolvedValueOnce({
      status: 202,
      data: {},
      headers: {}
    });

    await client.runDataPipeline({
      workspaceId: 'workspace-1',
      pipelineId: 'pipeline-1',
      jobType: 'Execute',
      executionData: { executeOption: 'ApplyChangesIfNeeded' },
      parameters: [
        {
          name: 'Threshold',
          value: 25,
          type: 'Number'
        }
      ]
    });

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      url: '/workspaces/workspace-1/items/pipeline-1/jobs/Execute/instances',
      data: {
        executionData: { executeOption: 'ApplyChangesIfNeeded' },
        parameters: [
          {
            name: 'Threshold',
            value: 25,
            type: 'Number'
          }
        ]
      }
    });
  });
});
