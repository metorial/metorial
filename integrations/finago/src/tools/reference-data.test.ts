import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let finagoClientMocks = vi.hoisted(() => ({
  get: vi.fn(),
  list: vi.fn()
}));

vi.mock('../lib/helpers', () => ({
  createClientFromContext: vi.fn(() => finagoClientMocks)
}));

import { finagoListReferenceData } from './reference-data';

let createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'token' },
    config: {}
  }) as any;

beforeEach(() => {
  finagoClientMocks.get.mockReset();
  finagoClientMocks.list.mockReset();
});

describe('Finago reference data tool', () => {
  it('wraps documented single-record endpoint responses in list output', async () => {
    finagoClientMocks.get.mockResolvedValue({ id: 7, name: 'Retail sales' });

    let result = await finagoListReferenceData.handleInvocation(
      createCtx({
        referenceType: 'sales_types',
        id: 7
      })
    );

    expect(finagoClientMocks.get).toHaveBeenCalledWith(
      '/salestypes/7',
      undefined,
      'read sales_types'
    );
    expect(finagoClientMocks.list).not.toHaveBeenCalled();
    expect(result.output).toEqual({
      records: [{ id: 7, name: 'Retail sales' }],
      count: 1,
      pageCount: 1,
      hasNextPage: false
    });
  });

  it('uses documented query parameters for dimension element list requests', async () => {
    finagoClientMocks.list.mockResolvedValue({
      records: [{ dimensionType: 1, value: 'P-1', name: 'Project 1' }],
      count: 1,
      pageCount: 1,
      hasNextPage: false
    });

    await finagoListReferenceData.handleInvocation(
      createCtx({
        referenceType: 'dimension_elements',
        dimensionType: 1,
        limit: 50,
        continuationToken: 'next-token',
        maxPages: 3
      })
    );

    expect(finagoClientMocks.list).toHaveBeenCalledWith(
      '/dimensions/1/elements',
      { limit: 50, continuationToken: 'next-token' },
      3,
      'read dimension_elements'
    );
    expect(finagoClientMocks.get).not.toHaveBeenCalled();
  });

  it('uses the documented pricelist prices path and productIds filter', async () => {
    finagoClientMocks.list.mockResolvedValue({
      records: [{ productId: 123, price: 99.99 }],
      count: 1,
      pageCount: 1,
      hasNextPage: false
    });

    await finagoListReferenceData.handleInvocation(
      createCtx({
        referenceType: 'price_list_prices',
        id: 2,
        productIds: '1..10,20'
      })
    );

    expect(finagoClientMocks.list).toHaveBeenCalledWith(
      '/pricelists/2/prices',
      { productIds: '1..10,20' },
      1,
      'read price_list_prices'
    );
  });

  it('rejects branch-specific inputs that the selected endpoint does not support', async () => {
    await expect(
      finagoListReferenceData.handleInvocation(
        createCtx({
          referenceType: 'taxes',
          productIds: '1'
        })
      )
    ).rejects.toBeInstanceOf(ServiceError);

    await expect(
      finagoListReferenceData.handleInvocation(
        createCtx({
          referenceType: 'price_list_prices'
        })
      )
    ).rejects.toBeInstanceOf(ServiceError);

    await expect(
      finagoListReferenceData.handleInvocation(
        createCtx({
          referenceType: 'dimension_elements',
          dimensionType: 1,
          value: 'P-1',
          limit: 10
        })
      )
    ).rejects.toBeInstanceOf(ServiceError);
  });
});
