import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let finOpsMocks = vi.hoisted(() => ({
  listDataEntityAll: vi.fn()
}));

vi.mock('@slates/dynamics-finops-recipes', async importOriginal => {
  let actual = await importOriginal<typeof import('@slates/dynamics-finops-recipes')>();

  return {
    ...actual,
    createDynamicsFinOpsClient: vi.fn(() => ({
      listDataEntityAll: finOpsMocks.listDataEntityAll
    }))
  };
});

import { provider } from './index';

let createClient = (config: Record<string, unknown> = {}) =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config,
      auth: {
        authenticationMethodId: 'microsoft_client_credentials',
        output: {
          finOpsToken: 'test-token',
          finOpsBaseUrl: 'https://contoso.operations.dynamics.com'
        }
      }
    }
  });

describe('Dynamics 365 Supply Chain Management list tools', () => {
  beforeEach(() => {
    finOpsMocks.listDataEntityAll.mockReset();
  });

  it('treats limit as a total record maximum, not only a page size', async () => {
    finOpsMocks.listDataEntityAll.mockResolvedValueOnce({
      items: [
        {
          ItemNumber: 'A0001',
          ProductName: 'Lamp',
          dataAreaId: 'USMF'
        },
        {
          ItemNumber: 'A0002',
          ProductName: 'Desk',
          dataAreaId: 'USMF'
        }
      ],
      pagesFetched: 1,
      truncated: false,
      nextLink: undefined
    });

    let client = createClient();
    let result = await client.invokeTool('supply_chain_list_released_products', {
      limit: 2,
      maxPages: 3,
      legalEntity: 'USMF'
    });

    expect(finOpsMocks.listDataEntityAll).toHaveBeenCalledWith(
      'ReleasedProductsV2',
      expect.objectContaining({
        top: 2,
        legalEntity: 'USMF',
        crossCompany: true,
        dataAreaId: undefined
      }),
      expect.objectContaining({
        maxPages: 3,
        pageSize: 2,
        maxItems: 2,
        dataAreaIdField: undefined
      })
    );
    expect(result.output.releasedProducts).toHaveLength(2);
    expect(result.output.page).toMatchObject({
      requestedLimit: 2,
      count: 2
    });
  });

  it('applies configured legal entity with cross-company for company-scoped lists', async () => {
    finOpsMocks.listDataEntityAll.mockResolvedValueOnce({
      items: [
        {
          SalesOrderNumber: 'SO-001',
          OrderingCustomerName: 'Contoso Retail',
          dataAreaId: 'USRT'
        }
      ],
      pagesFetched: 1,
      truncated: false,
      nextLink: undefined
    });

    let client = createClient({ finOpsDefaultLegalEntity: 'usrt' });
    let result = await client.invokeTool('supply_chain_list_sales_orders', {
      limit: 1
    });

    expect(finOpsMocks.listDataEntityAll).toHaveBeenCalledWith(
      'SalesOrderHeadersV2',
      expect.objectContaining({
        top: 1,
        legalEntity: 'usrt',
        crossCompany: true,
        dataAreaId: undefined
      }),
      expect.objectContaining({
        dataAreaIdField: undefined
      })
    );
    expect(result.output.salesOrders[0].legalEntity).toBe('USRT');
  });

  it('does not apply legal entity defaults to shared product lists', async () => {
    finOpsMocks.listDataEntityAll.mockResolvedValueOnce({
      items: [
        {
          ProductNumber: 'P-001',
          ProductName: 'Shared product'
        }
      ],
      pagesFetched: 1,
      truncated: false,
      nextLink: undefined
    });

    let client = createClient({ finOpsDefaultLegalEntity: 'usrt' });
    await client.invokeTool('supply_chain_list_products', {
      limit: 1
    });

    expect(finOpsMocks.listDataEntityAll).toHaveBeenCalledWith(
      'ProductsV2',
      expect.objectContaining({
        top: 1,
        legalEntity: undefined,
        crossCompany: undefined,
        dataAreaId: undefined
      }),
      expect.objectContaining({
        dataAreaIdField: false
      })
    );
  });

  it('rejects conflicting legal entity aliases before calling OData', async () => {
    let client = createClient();

    await expect(
      client.invokeTool('supply_chain_list_released_products', {
        legalEntity: 'USMF',
        dataAreaId: 'USRT'
      })
    ).rejects.toThrow('legalEntity and dataAreaId are aliases and must match');
    expect(finOpsMocks.listDataEntityAll).not.toHaveBeenCalled();
  });

  it('rejects legal entity scoping for shared product master lists', async () => {
    let client = createClient();

    await expect(
      client.invokeTool('supply_chain_list_products', {
        legalEntity: 'USMF'
      })
    ).rejects.toThrow('is not legal-entity scoped');
    expect(finOpsMocks.listDataEntityAll).not.toHaveBeenCalled();
  });
});
