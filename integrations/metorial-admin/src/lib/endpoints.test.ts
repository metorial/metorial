import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import {
  buildMetorialEndpointPath,
  buildMetorialEndpoints,
  extractPathParameters,
  listMetorialEndpoints,
  type MetorialIntrospectionDocs,
  resolveMetorialEndpointForCall
} from './endpoints';

let docs = {
  controllers: [
    {
      id: 'controller_visible',
      name: 'Providers',
      description: 'Provider resources',
      category: 'instance',
      deprecated: false,
      hideInDocs: false
    },
    {
      id: 'controller_hidden',
      name: 'Hidden',
      description: 'Hidden resources',
      deprecated: false,
      hideInDocs: true
    },
    {
      id: 'controller_deprecated',
      name: 'Deprecated',
      description: 'Deprecated resources',
      deprecated: true,
      hideInDocs: false
    }
  ],
  types: [
    {
      id: 'query_type',
      name: 'ProviderQuery',
      type: { properties: { limit: { type: 'number' } } }
    },
    {
      id: 'body_type',
      name: 'ProviderBody',
      type: { properties: { name: { type: 'string' } } }
    }
  ],
  endpoints: [
    {
      id: 'endpoint_visible',
      controllerId: 'controller_visible',
      method: 'GET',
      name: 'List providers',
      description: 'List providers for an instance',
      path: '/internal/providers',
      allPaths: [
        { path: '/internal/providers', sdkPath: 'internal.providers.list' },
        {
          path: '/dashboard/instances/:instanceId/providers/:providerId',
          sdkPath: 'dashboard.instances.providers.get'
        }
      ],
      deprecated: false,
      hideInDocs: false,
      confidential: false,
      outputId: 'output_type',
      queryId: 'query_type',
      bodyId: 'body_type'
    },
    {
      id: 'endpoint_post',
      controllerId: 'controller_visible',
      method: 'POST',
      name: 'Create provider',
      description: 'Create provider',
      path: '/internal/providers',
      allPaths: [
        {
          path: '/dashboard/instances/:instanceId/providers',
          sdkPath: 'dashboard.instances.providers.create'
        }
      ],
      deprecated: false,
      hideInDocs: false,
      confidential: false,
      outputId: 'output_type',
      queryId: null,
      bodyId: 'body_type'
    },
    {
      id: 'endpoint_hidden',
      controllerId: 'controller_hidden',
      method: 'GET',
      name: 'Hidden endpoint',
      allPaths: [{ path: '/dashboard/instances/:instanceId/hidden' }],
      deprecated: false,
      hideInDocs: false,
      outputId: 'output_type',
      queryId: null,
      bodyId: null
    },
    {
      id: 'endpoint_deprecated',
      controllerId: 'controller_deprecated',
      method: 'GET',
      name: 'Deprecated endpoint',
      allPaths: [{ path: '/dashboard/instances/:instanceId/deprecated' }],
      deprecated: false,
      hideInDocs: false,
      outputId: 'output_type',
      queryId: null,
      bodyId: null
    },
    {
      id: 'endpoint_endpoint_hidden',
      controllerId: 'controller_visible',
      method: 'GET',
      name: 'Endpoint hidden',
      allPaths: [{ path: '/dashboard/instances/:instanceId/endpoint-hidden' }],
      deprecated: false,
      hideInDocs: true,
      outputId: 'output_type',
      queryId: null,
      bodyId: null
    },
    {
      id: 'endpoint_confidential',
      controllerId: 'controller_visible',
      method: 'POST',
      name: 'Export provider auth credentials',
      allPaths: [{ path: '/dashboard/instances/:instanceId/provider-auth-exports' }],
      deprecated: false,
      hideInDocs: false,
      confidential: true,
      outputId: 'output_type',
      queryId: null,
      bodyId: 'body_type'
    },
    {
      id: 'endpoint_non_dashboard',
      controllerId: 'controller_visible',
      method: 'GET',
      name: 'Non-dashboard',
      allPaths: [{ path: '/instances/:instanceId/non-dashboard' }],
      deprecated: false,
      hideInDocs: false,
      outputId: 'output_type',
      queryId: null,
      bodyId: null
    }
  ]
} satisfies MetorialIntrospectionDocs;

describe('Metorial endpoint enrichment', () => {
  it('enriches endpoints with controller, query, body, selected dashboard path, and path parameters', () => {
    let [endpoint] = buildMetorialEndpoints(docs, { includeSchemas: true });

    expect(endpoint?.path).toBe('/dashboard/instances/:instanceId/providers/:providerId');
    expect(endpoint?.method).toBe('get');
    expect(endpoint?.controller).toEqual({
      name: 'Providers',
      description: 'Provider resources'
    });
    expect(endpoint?.query).toEqual({
      name: 'ProviderQuery',
      type: { properties: { limit: { type: 'number' } } }
    });
    expect(endpoint?.body).toEqual({
      name: 'ProviderBody',
      type: { properties: { name: { type: 'string' } } }
    });
    expect(endpoint?.pathParameters).toEqual(['instanceId', 'providerId']);
  });

  it('filters controller-level and endpoint-level hidden, deprecated, confidential, and non-dashboard endpoints', () => {
    let endpoints = buildMetorialEndpoints(docs);

    expect(endpoints.map(endpoint => endpoint.name)).toEqual([
      'List providers',
      'Create provider'
    ]);
  });

  it('strips internal endpoint and schema fields', () => {
    let [endpoint] = buildMetorialEndpoints(docs, { includeSchemas: true });

    expect(endpoint).not.toHaveProperty('id');
    expect(endpoint).not.toHaveProperty('controllerId');
    expect(endpoint).not.toHaveProperty('allPaths');
    expect(endpoint).not.toHaveProperty('deprecated');
    expect(endpoint).not.toHaveProperty('hideInDocs');
    expect(endpoint).not.toHaveProperty('confidential');
    expect(endpoint).not.toHaveProperty('outputId');
    expect(endpoint).not.toHaveProperty('queryId');
    expect(endpoint).not.toHaveProperty('bodyId');
    expect(endpoint?.controller).not.toHaveProperty('id');
    expect(endpoint?.query).not.toHaveProperty('id');
    expect(endpoint?.body).not.toHaveProperty('id');
  });

  it('returns compact output without schemas by default', () => {
    let [endpoint] = buildMetorialEndpoints(docs);

    expect(endpoint).not.toHaveProperty('query');
    expect(endpoint).not.toHaveProperty('body');
  });

  it('extracts unique path parameters', () => {
    expect(
      extractPathParameters(
        '/dashboard/instances/:instanceId/providers/:providerId/:providerId'
      )
    ).toEqual(['instanceId', 'providerId']);
  });

  it('filters and paginates list output', () => {
    let result = listMetorialEndpoints(docs, {
      method: 'post',
      search: 'provider',
      limit: 1,
      offset: 0
    });

    expect(result.total).toBe(1);
    expect(result.endpoints[0]?.method).toBe('post');
  });

  it('does not resolve confidential endpoints for calls', () => {
    expect(() =>
      resolveMetorialEndpointForCall(docs, {
        method: 'post',
        endpointPath: '/dashboard/instances/:instanceId/provider-auth-exports'
      })
    ).toThrow(/Unknown Metorial endpoint/);
  });
});

describe('Metorial call endpoint validation', () => {
  it('rejects unknown endpoints', () => {
    expect(() =>
      resolveMetorialEndpointForCall(docs, {
        method: 'get',
        endpointPath: '/dashboard/instances/:instanceId/missing'
      })
    ).toThrow(ServiceError);
  });

  it('rejects method mismatches', () => {
    expect(() =>
      resolveMetorialEndpointForCall(docs, {
        method: 'delete',
        endpointPath: '/dashboard/instances/:instanceId/providers'
      })
    ).toThrow(/does not support method delete/);
  });

  it('requires non-instance path parameters', () => {
    let endpoint = resolveMetorialEndpointForCall(docs, {
      method: 'get',
      endpointPath: '/dashboard/instances/:instanceId/providers/:providerId'
    });

    expect(() =>
      buildMetorialEndpointPath(endpoint, {
        instanceId: 'inst_123'
      })
    ).toThrow(/providerId/);
  });

  it('fills instanceId and other path parameters', () => {
    let endpoint = resolveMetorialEndpointForCall(docs, {
      method: 'get',
      endpointPath: '/dashboard/instances/:instanceId/providers/:providerId'
    });

    expect(
      buildMetorialEndpointPath(endpoint, {
        instanceId: 'inst_123',
        pathParams: { providerId: 'provider/demo' }
      })
    ).toBe('/dashboard/instances/inst_123/providers/provider%2Fdemo');
  });
});
