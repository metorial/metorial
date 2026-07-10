import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  buildAddCartLinesRequest,
  buildCartOperationRequest,
  buildCommercePageSummary,
  buildCommerceQueryResultSettings,
  buildCreateCartRequest,
  buildCreateCustomerRequest,
  buildCustomerOperationRequest,
  buildGetActivePricesRequest,
  buildGetEstimatedAvailabilityRequest,
  buildOrderOperationRequest,
  buildRemoveCartLinesRequest,
  buildRetailServerUrl,
  buildSearchOrdersRequest,
  buildSearchProductsRequest,
  buildUpdateCustomerRequest,
  type CommerceHttpClient,
  type CommerceHttpRequestConfig,
  type CommerceHttpResponse,
  commerceApiError,
  commerceCartOperationInputSchema,
  commerceCatalogInputSchema,
  commerceChannelInputSchema,
  commerceCustomerOperationInputSchema,
  commerceOrderOperationInputSchema,
  commerceProductInputSchema,
  commerceServiceError,
  createRetailServerMetadataAttachment,
  DynamicsCommerceRetailServerClient,
  getCommerceNextPageToken,
  normalizeCommercePageSize,
  normalizeCommerceSkip,
  normalizeRetailServerBaseUrl
} from './index';

describe('dynamics commerce recipes', () => {
  it('uses MCP-compatible top-level object schemas for operation inputs', () => {
    for (let schema of [
      commerceChannelInputSchema,
      commerceCatalogInputSchema,
      commerceProductInputSchema,
      commerceCustomerOperationInputSchema,
      commerceCartOperationInputSchema,
      commerceOrderOperationInputSchema
    ]) {
      let jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema).not.toHaveProperty('oneOf');
      expect(jsonSchema).not.toHaveProperty('anyOf');
      expect(jsonSchema).not.toHaveProperty('allOf');
    }
  });

  it('normalizes Retail Server base URLs to the Commerce OData root', () => {
    expect(normalizeRetailServerBaseUrl('https://scaleunit.example.com/RetailServer')).toBe(
      'https://scaleunit.example.com/RetailServer/Commerce/'
    );
    expect(
      normalizeRetailServerBaseUrl(
        'https://scaleunit.example.com/RetailServer/Commerce/$metadata'
      )
    ).toBe('https://scaleunit.example.com/RetailServer/Commerce/');
  });

  it('safely encodes Retail Server request URLs and query strings', () => {
    expect(
      buildRetailServerUrl(
        'https://scaleunit.example.com/RetailServer',
        'Products/SearchByText',
        {
          $top: 25,
          searchText: 'red shirt & blue'
        }
      )
    ).toBe(
      'https://scaleunit.example.com/RetailServer/Commerce/Products/SearchByText?%24top=25&searchText=red+shirt+%26+blue'
    );

    expect(() =>
      buildRetailServerUrl('https://scaleunit.example.com', 'https://evil.example.com')
    ).toThrow(ServiceError);
  });

  it('constructs customer request bodies with extension properties', () => {
    let createRequest = buildCreateCustomerRequest({
      customer: {
        FirstName: 'Ada',
        LastName: undefined
      },
      additionalFields: {
        LoyaltyTier: 'gold',
        EmailOptIn: true
      }
    });

    expect(createRequest).toMatchObject({
      method: 'POST',
      path: 'Customers',
      body: {
        FirstName: 'Ada',
        ExtensionProperties: [
          { Key: 'LoyaltyTier', Value: { StringValue: 'gold' } },
          { Key: 'EmailOptIn', Value: { BooleanValue: true } }
        ]
      }
    });

    expect(
      buildUpdateCustomerRequest({
        accountNumber: "O'Brien",
        customer: { Phone: '+15551234567' }
      })
    ).toMatchObject({
      method: 'PATCH',
      path: "Customers('O''Brien')",
      body: { Phone: '+15551234567' }
    });
  });

  it('constructs cart operation request bodies', () => {
    expect(
      buildCreateCartRequest({
        customerAccountNumber: 'C-100',
        channelId: 5637145359,
        additionalFields: {
          Source: 'slates'
        }
      })
    ).toMatchObject({
      method: 'POST',
      path: 'Carts',
      body: {
        CustomerId: 'C-100',
        ChannelId: 5637145359,
        ExtensionProperties: [{ Key: 'Source', Value: { StringValue: 'slates' } }]
      }
    });

    expect(
      buildAddCartLinesRequest({
        cartId: 'cart-1',
        cartLines: [{ ProductId: 123, Quantity: 2 }]
      })
    ).toMatchObject({
      method: 'POST',
      path: 'Carts/AddCartLines',
      body: {
        ID: 'cart-1',
        cartLines: [{ ProductId: 123, Quantity: 2 }]
      }
    });

    expect(
      buildRemoveCartLinesRequest({
        cartId: 'cart-1',
        lineIds: ['line-1', 'line-2']
      })
    ).toMatchObject({
      method: 'POST',
      path: 'Carts/RemoveCartLines',
      body: {
        ID: 'cart-1',
        cartLineIds: ['line-1', 'line-2']
      }
    });
  });

  it('constructs order search and action request bodies', () => {
    expect(
      buildSearchOrdersRequest({
        customerAccountNumber: 'C-100',
        startDate: '2026-01-01T00:00:00Z',
        top: 500,
        maxPageSize: 100,
        skip: 25
      })
    ).toMatchObject({
      method: 'POST',
      path: 'SalesOrders/Search',
      body: {
        salesOrderSearchCriteria: {
          CustomerAccountNumber: 'C-100',
          StartDate: '2026-01-01T00:00:00Z'
        },
        queryResultSettings: {
          Paging: {
            Top: 100,
            Skip: 25
          }
        }
      }
    });

    expect(
      buildOrderOperationRequest({
        action: 'get_by_transaction_id',
        transactionId: 'txn-123',
        searchLocationValue: 2
      })
    ).toMatchObject({
      path: 'SalesOrders/GetSalesOrderDetailsByTransactionId',
      body: {
        transactionId: 'txn-123',
        searchLocationValue: 2
      }
    });
  });

  it('enforces bounded pagination and numeric page tokens', () => {
    expect(normalizeCommercePageSize({ top: 250 })).toBe(200);
    expect(normalizeCommercePageSize({ pageSize: 80, maxPageSize: 100 })).toBe(80);
    expect(normalizeCommerceSkip({ pageToken: '75' })).toBe(75);
    expect(buildCommerceQueryResultSettings({ pageSize: 500, skip: 10 })).toEqual({
      Paging: {
        Top: 200,
        Skip: 10
      }
    });
    expect(getCommerceNextPageToken({ Results: [{ id: 1 }, { id: 2 }] }, { top: 2 })).toBe(
      '2'
    );
    expect(
      buildCommercePageSummary({ Results: [{ id: 1 }] }, { top: 2, skip: 4 })
    ).toMatchObject({
      top: 2,
      skip: 4,
      count: 1,
      nextPageToken: undefined
    });

    expect(() => normalizeCommercePageSize({ top: 0 })).toThrow(ServiceError);
    expect(() => normalizeCommerceSkip({ pageToken: 'abc' })).toThrow(ServiceError);
  });

  it('maps price and inventory helper inputs to Retail Server request bodies', () => {
    expect(
      buildGetActivePricesRequest({
        productIds: [1001, 1002],
        channelId: 5637145359,
        catalogId: 0,
        customerAccountNumber: 'C-100',
        currencyCode: 'USD',
        activeDate: '2026-02-03T12:00:00Z'
      })
    ).toMatchObject({
      method: 'POST',
      path: 'Products/GetActivePrices',
      body: {
        productIds: [1001, 1002],
        projectDomain: {
          ChannelId: 5637145359,
          CatalogId: 0,
          CurrencyCode: 'USD'
        },
        customerId: 'C-100',
        activeDate: '2026-02-03T12:00:00Z'
      }
    });

    expect(
      buildGetEstimatedAvailabilityRequest({
        productIds: [1001],
        channelId: 5637145359,
        warehouseIds: ['11'],
        pageSize: 20
      })
    ).toMatchObject({
      method: 'POST',
      path: 'Products/GetEstimatedAvailability',
      body: {
        searchCriteria: {
          ProductIds: [1001],
          ChannelId: 5637145359,
          WarehouseIds: ['11']
        },
        queryResultSettings: {
          Paging: {
            Top: 20,
            Skip: 0
          }
        }
      }
    });
  });

  it('validates incompatible or incomplete variant inputs at runtime', () => {
    expect(() =>
      buildSearchProductsRequest({
        searchText: 'shoe',
        categoryId: 123
      })
    ).toThrow(ServiceError);

    expect(() =>
      buildCustomerOperationRequest({
        action: 'get_order_history'
      })
    ).toThrow(ServiceError);

    expect(() =>
      buildCartOperationRequest({
        action: 'add_lines',
        cartId: 'cart-1'
      })
    ).toThrow(ServiceError);
  });

  it('creates attachment-ready metadata downloads without inline file fields', () => {
    expect(createRetailServerMetadataAttachment('<edmx />')).toEqual({
      mimeType: 'application/xml',
      content: {
        type: 'content',
        encoding: 'utf-8',
        content: '<edmx />'
      }
    });
  });

  it('normalizes Commerce API failures to ServiceError', () => {
    let error = commerceApiError(
      {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: {
            Message: 'Rate limit exceeded',
            ErrorCode: 'TooManyRequests'
          }
        }
      },
      'search products'
    );

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.reason).toBe('dynamics_commerce_api_error');
    expect(error.data.upstreamStatus).toBe(429);
    expect(error.data.upstreamCode).toBe('TooManyRequests');
    expect(error.data.message).toContain(
      'Dynamics 365 Commerce Retail Server API search products failed'
    );
    expect(error.data.message).toContain('HTTP 429 Too Many Requests');
    expect(error.data.message).toContain('Rate limit exceeded');

    let serviceError = commerceServiceError('Already normalized.');
    expect(commerceApiError(serviceError)).toBe(serviceError);
  });

  it('executes request specs through the mockable Retail Server client', async () => {
    let post = vi.fn(
      async <T = unknown>(
        _path: string,
        _body?: unknown,
        _config?: CommerceHttpRequestConfig
      ): Promise<CommerceHttpResponse<T>> => ({ data: { ok: true } as T })
    );
    let client = new DynamicsCommerceRetailServerClient({
      retailServerUrl: 'https://scaleunit.example.com/Commerce',
      api: {
        get: vi.fn(),
        post: post as unknown as CommerceHttpClient['post'],
        patch: vi.fn(),
        delete: vi.fn()
      }
    });

    let result = await client.addCartLines({
      cartId: 'cart-1',
      cartLines: [{ ProductId: 1001, Quantity: 1 }]
    });

    expect(result).toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith(
      'Carts/AddCartLines',
      {
        ID: 'cart-1',
        cartLines: [{ ProductId: 1001, Quantity: 1 }]
      },
      {
        params: undefined,
        responseType: undefined
      }
    );
  });
});
