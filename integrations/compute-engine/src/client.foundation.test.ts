import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveComputeEngineRegion, resolveComputeEngineZone } from './lib/errors';

let httpRequest = vi.fn();
let createAxiosMock = vi.fn(() => ({ request: httpRequest }));

let loadClient = async () => {
  vi.resetModules();
  httpRequest.mockReset();
  createAxiosMock.mockClear();

  vi.doMock('slates', async () => {
    let actual = await vi.importActual<typeof import('slates')>('slates');
    return { ...actual, createAxios: createAxiosMock };
  });

  return await import('./lib/client');
};

afterEach(() => {
  vi.doUnmock('slates');
  vi.resetModules();
});

describe('compute-engine client foundation', () => {
  it('configures Compute v1 once and returns request data through the shared adapter', async () => {
    let { COMPUTE_ENGINE_API_BASE_URL, ComputeEngineClient } = await loadClient();
    httpRequest.mockResolvedValueOnce({ data: { items: [{ name: 'vm-1' }] } });
    let client = new ComputeEngineClient({
      token: 'access-token',
      projectId: 'example project',
      defaultZone: 'us-central1-a',
      defaultRegion: 'us-central1'
    });

    expect(createAxiosMock).toHaveBeenCalledWith({
      baseURL: COMPUTE_ENGINE_API_BASE_URL,
      allowAbsoluteUrls: false,
      headers: {
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json'
      }
    });
    expect(client.projectPath('/zones/us-central1-a/instances')).toBe(
      'projects/example%20project/zones/us-central1-a/instances'
    );
    expect(client.defaultZone).toBe('us-central1-a');
    expect(client.defaultRegion).toBe('us-central1');

    let result = await client.request<{ items: Array<{ name: string }> }>('list instances', {
      method: 'get',
      path: '/projects/example-project/zones/us-central1-a/instances',
      params: { maxResults: 25 }
    });
    expect(result).toEqual({ items: [{ name: 'vm-1' }] });
    expect(httpRequest).toHaveBeenCalledWith({
      method: 'get',
      url: 'projects/example-project/zones/us-central1-a/instances',
      params: { maxResults: 25 },
      data: undefined
    });
  });

  it('maps upstream failures to a Compute Engine ServiceError', async () => {
    let { ComputeEngineClient } = await loadClient();
    httpRequest.mockRejectedValueOnce({
      response: {
        status: 403,
        statusText: 'Forbidden',
        data: {
          error: {
            message: 'Permission denied',
            errors: [{ reason: 'forbidden' }]
          }
        }
      }
    });
    let client = new ComputeEngineClient({
      token: 'access-token',
      projectId: 'example-project'
    });

    let caught: unknown;
    try {
      await client.request('get instance', {
        method: 'get',
        path: 'projects/example-project/zones/us-central1-a/instances/vm-1'
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ServiceError);
    expect((caught as { data: Record<string, unknown> }).data).toMatchObject({
      reason: 'compute_engine_api_error',
      upstreamStatus: 403
    });
    expect((caught as Error).message).toContain('Permission denied');
  });

  it('resolves explicit and configured zone/region defaults with ServiceError failures', () => {
    expect(resolveComputeEngineZone(' europe-west1-b ', 'us-central1-a')).toBe(
      'europe-west1-b'
    );
    expect(resolveComputeEngineZone(undefined, ' us-central1-a ')).toBe('us-central1-a');
    expect(resolveComputeEngineRegion('europe-west1', 'us-central1')).toBe('europe-west1');
    expect(resolveComputeEngineRegion(undefined, ' us-central1 ')).toBe('us-central1');

    let caught: unknown;
    try {
      resolveComputeEngineZone(undefined, undefined);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ServiceError);
    expect((caught as { data: Record<string, unknown> }).data.reason).toBe(
      'compute_engine_validation_error'
    );
  });
});
