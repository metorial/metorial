import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = vi.hoisted(() => ({
  api: {
    get: vi.fn()
  },
  createAuthenticatedAxios: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();

  return {
    ...actual,
    createAuthenticatedAxios: axiosMocks.createAuthenticatedAxios
  };
});

import {
  IfsApplicationsClient,
  nextPageTokenFromLink,
  paginationParamsFromSkipToken
} from './client';

let createClient = () =>
  new IfsApplicationsClient({
    baseUrl: 'https://tenant.example.com',
    auth: {
      token: 'access-token'
    },
    defaultPageSize: 25
  });

beforeEach(() => {
  axiosMocks.api.get.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReturnValue(axiosMocks.api);
});

describe('IFS Applications OData pagination helpers', () => {
  it('extracts skip tokens from relative next links', () => {
    expect(
      nextPageTokenFromLink(
        '/int/ifsapplications/projection/v1/Foo.svc/Things?$skiptoken=abc%20123'
      )
    ).toBe('abc 123');

    expect(
      paginationParamsFromSkipToken(
        '/int/ifsapplications/projection/v1/Foo.svc/Things?$skiptoken=abc%20123'
      )
    ).toEqual({ $skiptoken: 'abc 123' });
  });

  it('round-trips offset pagination as an opaque next page token', () => {
    expect(
      nextPageTokenFromLink(
        'https://tenant.example.com/int/ifsapplications/projection/v1/Foo.svc/Things?$skip=100'
      )
    ).toBe('skip:100');

    expect(paginationParamsFromSkipToken('skip:100')).toEqual({ $skip: '100' });
    expect(
      paginationParamsFromSkipToken(
        'https://tenant.example.com/int/ifsapplications/projection/v1/Foo.svc/Things?$skip=100'
      )
    ).toEqual({ $skip: '100' });
  });

  it('keeps bare opaque tokens as skip tokens', () => {
    expect(paginationParamsFromSkipToken('opaque-token==')).toEqual({
      $skiptoken: 'opaque-token=='
    });
  });
});

describe('IfsApplicationsClient listApiProjections', () => {
  it('uses entity service URLs for standard entity API summaries', async () => {
    axiosMocks.api.get.mockResolvedValue({
      data: {
        value: [
          {
            Name: 'AccountEntity',
            Categories: 'EntityService',
            Description: 'Account entity service'
          }
        ]
      }
    });

    let client = new IfsApplicationsClient({
      baseUrl: 'https://tenant.example.com',
      auth: {
        token: 'token'
      }
    });

    let result = await client.listApiProjections({
      apiClass: 'standardEntity',
      top: 5
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/main/ifsapplications/projection/v1/AllProjections.svc/Projections',
      {
        params: expect.objectContaining({
          $format: 'json',
          $filter: "Categories eq 'StandardEntity'",
          $top: 5
        })
      }
    );
    expect(result.projections).toHaveLength(1);
    expect(result.projections[0]).toMatchObject({
      name: 'AccountEntity',
      category: 'EntityService',
      serviceUrl:
        'https://tenant.example.com/int/ifsapplications/entity/v1/AccountEntity.svc/',
      openApiUrl:
        'https://tenant.example.com/int/ifsapplications/entity/v1/AccountEntity.svc/$openapi'
    });
  });
});

describe('IfsApplicationsClient queryProjectionRecords', () => {
  it('queries the selected projection endpoint with OData query parameters', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: [{ Id: 'A1', Name: 'Acme' }],
        '@odata.count': 1,
        '@odata.nextLink':
          '/main/ifsapplications/projection/v1/CustomerHandling.svc/Customers?$skiptoken=next%201'
      }
    });

    let result = await createClient().queryProjectionRecords({
      projectionName: 'CustomerHandling',
      projectionEndpoint: 'main',
      entitySet: 'Customers',
      select: ['Id', 'Name'],
      filter: "Name eq 'Acme'",
      orderBy: 'Name asc',
      top: 5,
      includeCount: true
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/main/ifsapplications/projection/v1/CustomerHandling.svc/Customers',
      {
        params: {
          $format: 'json',
          $select: 'Id,Name',
          $filter: "Name eq 'Acme'",
          $orderby: 'Name asc',
          $top: 5,
          $count: true
        }
      }
    );
    expect(result).toEqual({
      records: [{ Id: 'A1', Name: 'Acme' }],
      count: 1,
      nextPageToken: 'next 1'
    });
  });

  it('defaults projection record queries to the integration endpoint', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: []
      }
    });

    await createClient().queryProjectionRecords({
      projectionName: 'CustomerHandling',
      entitySet: 'Customers'
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/int/ifsapplications/projection/v1/CustomerHandling.svc/Customers',
      {
        params: {
          $format: 'json',
          $select: undefined,
          $filter: undefined,
          $orderby: undefined,
          $top: 25,
          $count: undefined
        }
      }
    );
  });

  it('rejects unsupported projection endpoints with ServiceError', async () => {
    await expect(
      createClient().queryProjectionRecords({
        projectionName: 'CustomerHandling',
        projectionEndpoint: 'svc' as never,
        entitySet: 'Customers'
      })
    ).rejects.toThrow(ServiceError);
  });

  it('rejects base URLs that include an IFS endpoint segment', () => {
    expect(
      () =>
        new IfsApplicationsClient({
          baseUrl: 'https://tenant.example.com/b2b',
          auth: {
            token: 'access-token'
          }
        })
    ).toThrow(ServiceError);
  });
});
