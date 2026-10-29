import { createLocalSlateTestClient } from '@slates/test';
import type { SlateRuntimeInfo } from 'slates';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_API_URL, DEFAULT_API_VERSION } from '../config';
import { provider } from '../index';
import { contract } from './contractTools';

let LEGACY_SETTINGS = {
  apiUrl: 'https://legacy-config.example.test',
  apiVersion: 'mt_user_configured_version'
};

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
  fetchMock.mock.calls.map(([url, init]) => {
    let parsed = new URL(String(url));
    return [
      `${parsed.origin}${parsed.pathname}`,
      (init?.headers as Record<string, string>)['Metorial-Version']
    ] as const;
  });

let createTestClient = (runtimeInfo?: SlateRuntimeInfo) =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: LEGACY_SETTINGS,
      auth: {
        authenticationMethodId: 'api_key',
        output: { token: 'test-token', apiUrl: 'https://legacy-auth.example.test' }
      },
      runtimeInfo
    }
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Metorial API target (contract test: the API accepts any supported version on any regional host, so live E2E cannot observe which URL or version a tool used)', () => {
  it('sends generated tools to the environment API URL with the contract API version', async () => {
    let fetchMock = stubFetch();

    await createTestClient({
      metorial: { apiUrl: 'https://api-eu1.metorial.test/' }
    }).invokeTool('files_get', { file_id: 'file_1', instance_id: 'inst_1' });

    expect(sentRequests(fetchMock)).toEqual([
      ['https://api-eu1.metorial.test/files/file_1', contract.generatedFrom.apiVersion]
    ]);
  });

  it('sends call_endpoint to the environment API URL with the built-in API version', async () => {
    let fetchMock = stubFetch();

    await createTestClient({
      metorial: { apiUrl: 'https://api-us1.metorial.test' }
    }).invokeTool('call_endpoint', {
      method: 'get',
      endpointPath: '/dashboard/instances/:instanceId',
      instanceId: 'inst_1'
    });

    expect(sentRequests(fetchMock)).toEqual([
      ['https://api-us1.metorial.test/metorial/introspect/endpoints', DEFAULT_API_VERSION],
      ['https://api-us1.metorial.test/dashboard/instances/inst_1', DEFAULT_API_VERSION]
    ]);
  });

  it('falls back to the default API URL and ignores saved URL and version settings', async () => {
    let fetchMock = stubFetch();

    await createTestClient().invokeTool('files_get', {
      file_id: 'file_1',
      instance_id: 'inst_1'
    });

    expect(sentRequests(fetchMock)).toEqual([
      [`${DEFAULT_API_URL}/files/file_1`, DEFAULT_API_VERSION]
    ]);
  });
});
