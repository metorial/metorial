import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import {
  buildDocumentedAddCartLinesRequest,
  buildDocumentedCheckoutCartRequest,
  buildDocumentedGetActivePricesRequest,
  buildDocumentedGetCustomerOrderHistoryRequest,
  buildDocumentedGetCustomersByAccountNumbersRequest,
  buildDocumentedGetEstimatedAvailabilityRequest,
  buildDocumentedGetOrderBySalesIdRequest,
  buildDocumentedGetOrderByTransactionIdRequest,
  buildDocumentedGetProductAvailabilitiesRequest,
  buildDocumentedGetProductRequest,
  buildDocumentedGetProductsByIdsRequest,
  buildDocumentedSearchProductsRequest,
  findCatalogById
} from './retail-server-requests';

describe('documented Commerce Retail Server requests', () => {
  it('builds product request payloads with documented action parameters', () => {
    expect(
      buildDocumentedSearchProductsRequest({
        searchText: 'running shoes',
        channelId: 5637145359,
        catalogId: 0,
        refiners: [{ RefinerRecordId: 123 }],
        top: 10
      })
    ).toMatchObject({
      method: 'POST',
      path: 'Products/RefineSearchByText',
      body: {
        channelId: 5637145359,
        catalogId: 0,
        searchText: 'running shoes',
        refinementCriteria: [{ RefinerRecordId: 123 }],
        queryResultSettings: {
          Paging: {
            Top: 10,
            Skip: 0
          }
        }
      }
    });

    let getProduct = buildDocumentedGetProductRequest({
      productId: 1001,
      channelId: 5637145359,
      catalogId: 0
    } as any);

    expect(getProduct).toMatchObject({
      path: 'Products/GetById',
      body: {
        recordId: 1001,
        channelId: 5637145359
      }
    });
    expect(getProduct.body as Record<string, unknown>).not.toHaveProperty('catalogId');

    let byIds = buildDocumentedGetProductsByIdsRequest({
      productIds: [1001, 1002],
      channelId: 5637145359,
      catalogId: 0,
      pageSize: 2
    } as any);

    expect(byIds).toMatchObject({
      path: 'Products/GetByIds',
      body: {
        channelId: 5637145359,
        productIds: [1001, 1002],
        queryResultSettings: {
          Paging: {
            Top: 2,
            Skip: 0
          }
        }
      }
    });
    expect(byIds.body as Record<string, unknown>).not.toHaveProperty('catalogId');
  });

  it('rejects product search without text or category input', () => {
    expect(() =>
      buildDocumentedSearchProductsRequest({
        channelId: 5637145359,
        catalogId: 0
      })
    ).toThrow(ServiceError);
  });

  it('builds documented price and inventory payloads', () => {
    expect(
      buildDocumentedGetActivePricesRequest({
        productIds: [1001],
        channelId: 5637145359,
        catalogId: 0,
        customerAccountNumber: 'C-100',
        activeDate: '2026-01-01T00:00:00Z',
        includeSimpleDiscountsInContextualPrice: true,
        top: 1
      })
    ).toMatchObject({
      path: 'Products/GetActivePrices',
      body: {
        projectDomain: {
          ChannelId: 5637145359,
          CatalogId: 0
        },
        productIds: [1001],
        activeDate: '2026-01-01T00:00:00Z',
        customerId: 'C-100',
        includeSimpleDiscountsInContextualPrice: true,
        queryResultSettings: {
          Paging: {
            Top: 1,
            Skip: 0
          }
        }
      }
    });

    let availabilities = buildDocumentedGetProductAvailabilitiesRequest({
      itemIds: ['0001'],
      channelId: 5637145359,
      catalogId: 0,
      skip: 4,
      top: 5
    } as any);

    expect(availabilities).toMatchObject({
      path: 'Products/GetProductAvailabilities',
      body: {
        itemIds: ['0001'],
        channelId: 5637145359,
        queryResultSettings: {
          Paging: {
            Top: 5,
            Skip: 4
          }
        }
      }
    });
    expect(availabilities.body as Record<string, unknown>).not.toHaveProperty('catalogId');

    let estimated = buildDocumentedGetEstimatedAvailabilityRequest({
      productIds: [1001],
      channelId: 5637145359,
      warehouseIds: ['11'],
      top: 10
    } as any);

    expect(estimated).toMatchObject({
      path: 'Products/GetEstimatedAvailability',
      body: {
        searchCriteria: {
          ProductIds: [1001],
          ChannelId: 5637145359,
          WarehouseIds: ['11']
        }
      }
    });
    expect(estimated.body as Record<string, unknown>).not.toHaveProperty(
      'queryResultSettings'
    );
  });

  it('builds documented customer request payloads and validates search location', () => {
    expect(
      buildDocumentedGetCustomersByAccountNumbersRequest({
        accountNumbers: ['C-100'],
        searchLocationValue: 2,
        top: 3
      })
    ).toMatchObject({
      path: 'Customers/GetByAccountNumbers',
      body: {
        accountNumbers: ['C-100'],
        searchLocationValue: 2,
        queryResultSettings: {
          Paging: {
            Top: 3,
            Skip: 0
          }
        }
      }
    });

    expect(
      buildDocumentedGetCustomerOrderHistoryRequest({
        accountNumber: 'C-100',
        channelId: 5637145359,
        pageSize: 4
      } as any)
    ).toMatchObject({
      path: 'Customers/GetOrderHistory',
      body: {
        accountNumber: 'C-100',
        queryResultSettings: {
          Paging: {
            Top: 4,
            Skip: 0
          }
        }
      }
    });

    expect(() =>
      buildDocumentedGetCustomersByAccountNumbersRequest({
        accountNumbers: ['C-100']
      })
    ).toThrow(ServiceError);
  });

  it('builds documented cart and order action names and parameters', () => {
    expect(
      buildDocumentedAddCartLinesRequest({
        cartId: 'cart-1',
        cartLines: [{ ProductId: 1001, Quantity: 1 }],
        cartVersion: 7
      })
    ).toMatchObject({
      path: 'Carts/AddCartLines',
      body: {
        ID: 'cart-1',
        cartLines: [{ ProductId: 1001, Quantity: 1 }],
        cartVersion: 7
      }
    });

    expect(
      buildDocumentedCheckoutCartRequest({
        cartId: 'cart-1',
        receiptEmail: 'ada@example.com',
        receiptNumberSequence: 'RT-001',
        cartVersion: 8
      })
    ).toMatchObject({
      path: 'Carts/Checkout',
      body: {
        ID: 'cart-1',
        receiptEmail: 'ada@example.com',
        receiptNumberSequence: 'RT-001',
        cartVersion: 8
      }
    });

    expect(
      buildDocumentedGetOrderByTransactionIdRequest({
        transactionId: 'txn-1',
        searchLocationValue: 2
      })
    ).toMatchObject({
      path: 'SalesOrders/GetSalesOrderDetailsByTransactionId',
      body: {
        transactionId: 'txn-1',
        searchLocationValue: 2
      }
    });

    expect(buildDocumentedGetOrderBySalesIdRequest({ salesId: 'SO-100' })).toMatchObject({
      path: 'SalesOrders/GetSalesOrderDetailsBySalesId',
      body: {
        salesId: 'SO-100'
      }
    });

    expect(() =>
      buildDocumentedGetOrderByTransactionIdRequest({ transactionId: 'txn-1' })
    ).toThrow(ServiceError);
  });

  it('selects catalogs from the documented GetCatalogs response page', () => {
    expect(
      findCatalogById(
        {
          Results: [
            { RecordId: 100, Name: 'Default' },
            { CatalogId: '200', Name: 'Wholesale' }
          ]
        },
        '200'
      )
    ).toEqual({ CatalogId: '200', Name: 'Wholesale' });
  });
});
