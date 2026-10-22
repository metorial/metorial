import { createLocalSlateTestClient } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { provider } from '../index';
import { contract } from './contractTools';

let USER_API_VERSION = 'mt_user_configured_version';

let introspectionDocs = {
  controllers: [
    {
      id: 'controller_instances',
      name: 'Instances',
      description: 'Instance resources',
      category: 'instance',
      deprecated: false,
      hideInDocs: false
    }
  ],
  types: [],
  endpoints: [
    {
      id: 'endpoint_get_instance',
      controllerId: 'controller_instances',
      method: 'GET',
      name: 'Get instance',
      description: 'Get an instance',
      path: '/dashboard/instances/:instanceId',
      allPaths: [
        {
          path: '/dashboard/instances/:instanceId',
          sdkPath: 'dashboard.instances.get'
        }
      ],
      deprecated: false,
      hideInDocs: false,
      confidential: false
    }
  ]
};

let stubFetch = () => {
  let fetchMock = vi.fn(async (url: string | URL, _init?: RequestInit) => {
    let body = String(url).includes('/metorial/introspect/endpoints')
      ? introspectionDocs
      : { id: 'resource_1' };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

let sentRequests = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls.map(
    ([url, init]) =>
      [new URL(String(url)).pathname, init?.headers as Record<string, string>] as const
  );

let createTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: { apiVersion: USER_API_VERSION },
      auth: {
        authenticationMethodId: 'api_key',
        output: { token: 'test-token' }
      }
    }
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Metorial-Version header (contract test: the API accepts any supported version, so live E2E cannot observe which version a tool sent)', () => {
  it('sends the contract API version from generated tools, ignoring the configured version', async () => {
    let fetchMock = stubFetch();

    await createTestClient().invokeTool('files_get', {
      file_id: 'file_1',
      instance_id: 'inst_1'
    });

    expect(sentRequests(fetchMock)).toEqual([
      [
        '/files/file_1',
        expect.objectContaining({ 'Metorial-Version': contract.generatedFrom.apiVersion })
      ]
    ]);
    expect(contract.generatedFrom.apiVersion).not.toBe(USER_API_VERSION);
  });

  it('keeps the configured API version for call_endpoint', async () => {
    let fetchMock = stubFetch();

    await createTestClient().invokeTool('call_endpoint', {
      method: 'get',
      endpointPath: '/dashboard/instances/:instanceId',
      instanceId: 'inst_1'
    });

    expect(sentRequests(fetchMock)).toEqual([
      [
        '/metorial/introspect/endpoints',
        expect.objectContaining({ 'Metorial-Version': USER_API_VERSION })
      ],
      [
        '/dashboard/instances/inst_1',
        expect.objectContaining({ 'Metorial-Version': USER_API_VERSION })
      ]
    ]);
  });
});
