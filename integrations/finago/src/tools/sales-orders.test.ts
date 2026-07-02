import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mocks = vi.hoisted(() => ({
  client: {
    get: vi.fn(),
    list: vi.fn(),
    post: vi.fn(),
    patch: vi.fn()
  }
}));

vi.mock('../lib/helpers', () => ({
  createClientFromContext: () => mocks.client
}));

import {
  finagoCreateSalesOrder,
  finagoGetSalesOrder,
  finagoInvoiceSalesOrder,
  finagoListSalesOrders
} from './sales-orders';

let invokeListSalesOrders = (input: Record<string, unknown>) =>
  finagoListSalesOrders.handleInvocation({
    input,
    auth: { token: 'token' },
    config: {}
  } as any);

let invokeGetSalesOrder = (input: Record<string, unknown>) =>
  finagoGetSalesOrder.handleInvocation({
    input,
    auth: { token: 'token' },
    config: {}
  } as any);

let invokeCreateSalesOrder = (input: Record<string, unknown>) =>
  finagoCreateSalesOrder.handleInvocation({
    input,
    auth: { token: 'token' },
    config: {}
  } as any);

let invokeInvoiceSalesOrder = (input: Record<string, unknown>) =>
  finagoInvoiceSalesOrder.handleInvocation({
    input,
    auth: { token: 'token' },
    config: {}
  } as any);

describe('finago_list_sales_orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the documented GET /salesorders query parameters', async () => {
    mocks.client.list.mockResolvedValue({
      records: [],
      pageCount: 1,
      hasNextPage: true,
      nextLink:
        'https://rest.api.24sevenoffice.com/v1/salesorders?continuationToken=next-token'
    });

    let result = await invokeListSalesOrders({
      limit: 25,
      continuationToken: 'start-token',
      date: '2024-01-15',
      dateFrom: '2024-01-01',
      dateTo: '2024-01-31',
      status: 'Confirmed',
      customerId: '12345',
      invoiceNumber: '9876',
      createdFrom: '2024-01-01T00:00:00Z',
      createdTo: '2024-01-31T23:59:59Z',
      modifiedFrom: '2024-02-01T00:00:00Z',
      modifiedTo: '2024-02-29T23:59:59Z',
      maxPages: 2
    });

    expect(mocks.client.list).toHaveBeenCalledWith(
      '/salesorders',
      {
        limit: 25,
        continuationToken: 'start-token',
        date: '2024-01-15',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        status: 'Confirmed',
        customerId: '12345',
        invoiceNumber: '9876',
        createdFrom: '2024-01-01T00:00:00Z',
        createdTo: '2024-01-31T23:59:59Z',
        modifiedFrom: '2024-02-01T00:00:00Z',
        modifiedTo: '2024-02-29T23:59:59Z'
      },
      2,
      'list sales orders'
    );
    expect(result.output).toMatchObject({
      salesOrders: [],
      count: 0,
      pageCount: 1,
      hasNextPage: true,
      nextLink:
        'https://rest.api.24sevenoffice.com/v1/salesorders?continuationToken=next-token'
    });
  });

  it('uses documented sales order ID paths when lines and attachments are included', async () => {
    let salesOrder = {
      id: 1234,
      customer: { id: 5678, name: 'ABC Corporation' },
      status: 'Confirmed',
      date: '2024-01-15',
      invoice: { number: 9876 },
      createdAt: '2024-01-15T10:00:00Z',
      modifiedAt: '2024-01-16T11:00:00Z'
    };
    let line = { id: 11, type: 'text', description: 'Implementation services' };
    let attachment = {
      fileId: 'file-123',
      orderId: 1234,
      fileName: 'attachment.pdf',
      mediaType: 'application/pdf'
    };

    mocks.client.list
      .mockResolvedValueOnce({
        records: [salesOrder],
        pageCount: 1,
        hasNextPage: false
      })
      .mockResolvedValueOnce({
        records: [line],
        pageCount: 1,
        hasNextPage: false
      })
      .mockResolvedValueOnce({
        records: [attachment],
        pageCount: 1,
        hasNextPage: false
      });

    let result = await invokeListSalesOrders({
      includeLines: true,
      includeAttachments: true
    });

    expect(mocks.client.list).toHaveBeenNthCalledWith(
      1,
      '/salesorders',
      {
        limit: undefined,
        continuationToken: undefined,
        date: undefined,
        dateFrom: undefined,
        dateTo: undefined,
        status: undefined,
        customerId: undefined,
        invoiceNumber: undefined,
        createdFrom: undefined,
        createdTo: undefined,
        modifiedFrom: undefined,
        modifiedTo: undefined
      },
      1,
      'list sales orders'
    );
    expect(mocks.client.list).toHaveBeenNthCalledWith(
      2,
      '/salesorders/1234/lines',
      undefined,
      1,
      'list sales order lines'
    );
    expect(mocks.client.list).toHaveBeenNthCalledWith(
      3,
      '/salesorders/1234/attachments',
      undefined,
      1,
      'list sales order attachments'
    );
    expect(result.output.salesOrders[0]).toMatchObject({
      salesOrderId: 1234,
      status: 'Confirmed',
      customerId: 5678,
      customerName: 'ABC Corporation',
      date: '2024-01-15',
      invoiceNumber: 9876,
      createdAt: '2024-01-15T10:00:00Z',
      modifiedAt: '2024-01-16T11:00:00Z',
      lines: [line],
      attachments: [attachment]
    });
  });

  it('throws ServiceError when include flags require a documented integer sales order ID path', async () => {
    mocks.client.list.mockResolvedValueOnce({
      records: [{ status: 'Draft' }],
      pageCount: 1,
      hasNextPage: false
    });

    await expect(invokeListSalesOrders({ includeLines: true })).rejects.toBeInstanceOf(
      ServiceError
    );
    expect(mocks.client.list).toHaveBeenCalledTimes(1);

    mocks.client.list.mockResolvedValueOnce({
      records: [{ id: 2_147_483_648, status: 'Draft' }],
      pageCount: 1,
      hasNextPage: false
    });

    await expect(invokeListSalesOrders({ includeAttachments: true })).rejects.toBeInstanceOf(
      ServiceError
    );
    expect(mocks.client.list).toHaveBeenCalledTimes(2);
  });
});

describe('finago_create_sales_order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts documented sales order and line request bodies', async () => {
    let order = {
      id: 1234,
      customer: { id: 1001, name: 'ABC Corporation' },
      status: 'Draft',
      date: '2026-06-01'
    };
    let productLine = { id: 501, type: 'product', product: { id: 2001 } };
    let textLine = { id: 502, type: 'text', description: 'Gift wrapping' };
    mocks.client.post
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(productLine)
      .mockResolvedValueOnce(textLine);

    let result = await invokeCreateSalesOrder({
      customerId: 1001,
      customerName: 'ABC Corporation',
      customerOrganizationNumber: '123456789',
      customerInvoiceEmailAddresses: ['billing@example.com'],
      customerGln: '1234567890123',
      customerStreet: 'Hovedgata 1',
      customerPostalCode: '0123',
      customerPostalArea: 'Fornebu',
      customerCity: 'Fornebu',
      customerCountrySubdivision: 'Viken',
      customerCountryCode: 'NO',
      status: 'Draft',
      date: '2026-06-01',
      deliveryDate: '2026-06-10',
      deliveryCustomer: {
        id: 1001,
        name: 'Warehouse',
        street: 'Delivery road 2',
        postalCode: '0456',
        postalArea: 'Oslo',
        city: 'Oslo',
        countrySubdivision: 'Oslo',
        countryCode: 'NO'
      },
      currencyCode: 'USD',
      currencyRate: 1,
      memo: 'Customer memo',
      internalMemo: 'Internal memo',
      referenceNumber: 'PO12345',
      paymentMethodId: null,
      salesTypeId: -100,
      invoiceDate: '2026-06-01',
      invoiceDueDate: '2026-06-15',
      invoiceDistributionMethod: 'emaildistribution',
      invoiceRemittanceReference: 'KID123',
      invoicePaymentTermsType: 'NumberOfDays',
      invoicePaymentTermsDays: 14,
      accrual: { startDate: '2026-06-01', length: 12 },
      yourReferenceId: 44,
      yourReferenceName: 'John Doe',
      ourReferenceId: 55,
      dimensions: [{ dimensionType: 1, value: '13', name: 'Project with ID 13' }],
      lines: [
        {
          type: 'product',
          productId: 2001,
          productNumber: 'IGNORED-BY-FINAGO',
          description: 'Leather handbag with adjustable strap.',
          quantity: 2,
          price: 49.99,
          costPrice: null,
          discountRate: 10,
          taxId: 1,
          taxNumber: 1,
          taxRate: 25,
          accountId: 200001,
          accountNumber: 1500,
          accountName: 'Accounts Receivable',
          isHidden: false,
          dimensions: [{ dimensionType: 1, value: '13', name: 'Project with ID 13' }],
          accrual: {}
        },
        {
          type: 'text',
          description: 'Gift wrapping',
          quantity: 1,
          price: 4.99
        }
      ]
    });

    expect(mocks.client.post).toHaveBeenNthCalledWith(
      1,
      '/salesorders',
      {
        status: 'Draft',
        date: '2026-06-01',
        deliveryDate: '2026-06-10',
        memo: 'Customer memo',
        internalMemo: 'Internal memo',
        referenceNumber: 'PO12345',
        dimensions: [{ dimensionType: 1, value: '13', name: 'Project with ID 13' }],
        accrual: { startDate: '2026-06-01', length: 12 },
        customer: {
          id: 1001,
          name: 'ABC Corporation',
          organizationNumber: '123456789',
          invoiceEmailAddresses: ['billing@example.com'],
          gln: '1234567890123',
          street: 'Hovedgata 1',
          postalCode: '0123',
          postalArea: 'Fornebu',
          city: 'Fornebu',
          countrySubdivision: 'Viken',
          countryCode: 'NO'
        },
        currency: { code: 'USD', rate: 1 },
        deliveryCustomer: {
          id: 1001,
          name: 'Warehouse',
          street: 'Delivery road 2',
          postalCode: '0456',
          postalArea: 'Oslo',
          city: 'Oslo',
          countrySubdivision: 'Oslo',
          countryCode: 'NO'
        },
        paymentMethod: { id: null },
        salesType: { id: -100 },
        invoice: {
          date: '2026-06-01',
          dueDate: '2026-06-15',
          distributionMethod: 'emaildistribution',
          remittanceReference: 'KID123',
          paymentTerms: { type: 'NumberOfDays', value: 14 }
        },
        yourReference: { id: 44, name: 'John Doe' },
        ourReference: { id: 55 }
      },
      undefined,
      'create sales order'
    );
    expect(mocks.client.post).toHaveBeenNthCalledWith(
      2,
      '/salesorders/1234/lines',
      {
        type: 'product',
        description: 'Leather handbag with adjustable strap.',
        quantity: 2,
        price: 49.99,
        costPrice: null,
        discountRate: 10,
        isHidden: false,
        dimensions: [{ dimensionType: 1, value: '13', name: 'Project with ID 13' }],
        accrual: {},
        product: { id: 2001 },
        tax: { id: 1, number: 1, rate: 25 },
        account: { id: 200001, number: 1500, name: 'Accounts Receivable' }
      },
      undefined,
      'create sales order line'
    );
    expect(mocks.client.post).toHaveBeenNthCalledWith(
      3,
      '/salesorders/1234/lines',
      {
        type: 'text',
        description: 'Gift wrapping',
        quantity: 1,
        price: 4.99
      },
      undefined,
      'create sales order line'
    );
    expect(result.output).toMatchObject({
      salesOrderId: 1234,
      lineCount: 2,
      lines: [productLine, textLine]
    });
  });

  it('validates local line bodies before creating the upstream sales order', async () => {
    await expect(
      invokeCreateSalesOrder({
        customerId: 1001,
        customerName: 'ABC Corporation',
        lines: [{ type: 'product', productNumber: 'SKU-001' }]
      })
    ).rejects.toBeInstanceOf(ServiceError);

    expect(mocks.client.post).not.toHaveBeenCalled();
  });

  it('rejects additionalFields conflicts before creating the upstream sales order', async () => {
    await expect(
      invokeCreateSalesOrder({
        customerId: 1001,
        customerName: 'ABC Corporation',
        additionalFields: {
          customer: { id: 2002, name: 'Override' }
        }
      })
    ).rejects.toBeInstanceOf(ServiceError);

    expect(mocks.client.post).not.toHaveBeenCalled();
  });
});

describe('finago_invoice_sales_order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('patches status and documented invoice fields to invoice a sales order', async () => {
    mocks.client.patch.mockResolvedValue({
      id: 1234,
      status: 'Invoice',
      invoice: {
        number: 9876,
        date: '2024-02-01',
        dueDate: '2024-02-15',
        distributionMethod: 'emaildistribution',
        paymentTerms: { type: 'NumberOfDays', value: 14 },
        remittanceReference: 'KID123',
        transaction: { id: '63293496-884f-4358-b489-f641fe51cdaa' }
      }
    });

    let result = await invokeInvoiceSalesOrder({
      salesOrderId: 1234,
      confirm: true,
      invoiceDate: '2024-02-01',
      invoiceDueDate: '2024-02-15',
      invoiceDistributionMethod: 'emaildistribution',
      invoiceRemittanceReference: 'KID123',
      invoicePaymentTermsType: 'NumberOfDays',
      invoicePaymentTermsDays: 14,
      additionalFields: {
        ourReference: { id: 44 }
      }
    });

    expect(mocks.client.patch).toHaveBeenCalledWith(
      '/salesorders/1234',
      {
        status: 'Invoice',
        invoice: {
          date: '2024-02-01',
          dueDate: '2024-02-15',
          distributionMethod: 'emaildistribution',
          remittanceReference: 'KID123',
          paymentTerms: { type: 'NumberOfDays', value: 14 }
        },
        ourReference: { id: 44 }
      },
      undefined,
      'invoice sales order'
    );
    expect(result.output).toMatchObject({
      salesOrderId: 1234,
      status: 'Invoice',
      invoiceNumber: 9876,
      invoiceDate: '2024-02-01',
      invoiceDueDate: '2024-02-15',
      invoiceDistributionMethod: 'emaildistribution',
      invoiceRemittanceReference: 'KID123',
      invoicePaymentTerms: { type: 'NumberOfDays', value: 14 },
      invoiceTransactionId: '63293496-884f-4358-b489-f641fe51cdaa'
    });
  });

  it('requires explicit confirmation before invoicing', async () => {
    await expect(
      invokeInvoiceSalesOrder({
        salesOrderId: 1234,
        confirm: false
      })
    ).rejects.toBeInstanceOf(ServiceError);

    expect(mocks.client.patch).not.toHaveBeenCalled();
  });

  it('requires a documented int32 sales order path ID', async () => {
    await expect(
      invokeInvoiceSalesOrder({
        salesOrderId: 2_147_483_648,
        confirm: true
      })
    ).rejects.toBeInstanceOf(ServiceError);

    expect(mocks.client.patch).not.toHaveBeenCalled();
  });

  it('rejects incompatible invoice payment term fields with ServiceError', async () => {
    await expect(
      invokeInvoiceSalesOrder({
        salesOrderId: 1234,
        confirm: true,
        invoicePaymentTermsType: 'FixedDate',
        invoicePaymentTermsDays: 14
      })
    ).rejects.toBeInstanceOf(ServiceError);

    expect(mocks.client.patch).not.toHaveBeenCalled();
  });
});

describe('finago_get_sales_order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads the documented sales order, lines, and attachment endpoints', async () => {
    let order = {
      id: 1234,
      customer: { id: 1001, name: 'Acme AS' },
      status: 'Invoice',
      date: '2026-06-01',
      invoice: { number: 9001 },
      grossAmount: 125,
      netAmount: 100,
      taxAmount: 25
    };
    let line = {
      id: 987,
      type: 'product',
      product: { id: 10, number: 'PROD-10' },
      description: 'Consulting',
      quantity: 1,
      price: 100
    };
    let attachment = {
      fileId: 'file-123',
      orderId: 1234,
      fileName: 'invoice.pdf',
      mediaType: 'application/pdf',
      size: 2048,
      timestamp: '2026-06-01T12:00:00Z',
      tags: ['invoice']
    };

    mocks.client.get.mockResolvedValue(order);
    mocks.client.list
      .mockResolvedValueOnce({ records: [line] })
      .mockResolvedValueOnce({ records: [attachment] });

    let result = await invokeGetSalesOrder({
      salesOrderId: 1234,
      includeLines: true,
      includeAttachments: true
    });

    expect(mocks.client.get).toHaveBeenCalledWith(
      '/salesorders/1234',
      undefined,
      'read sales order'
    );
    expect(mocks.client.list).toHaveBeenNthCalledWith(
      1,
      '/salesorders/1234/lines',
      undefined,
      1,
      'list sales order lines'
    );
    expect(mocks.client.list).toHaveBeenNthCalledWith(
      2,
      '/salesorders/1234/attachments',
      undefined,
      1,
      'list sales order attachments'
    );
    expect(result.output).toEqual({
      salesOrderId: 1234,
      status: 'Invoice',
      customerId: 1001,
      customerName: 'Acme AS',
      date: '2026-06-01',
      invoiceNumber: 9001,
      grossAmount: 125,
      netAmount: 100,
      taxAmount: 25,
      createdAt: undefined,
      modifiedAt: undefined,
      lines: [line],
      attachments: [attachment],
      record: order,
      lineCount: 1,
      attachmentCount: 1
    });
  });

  it('rejects sales order IDs outside the documented int32 path range', async () => {
    await expect(
      invokeGetSalesOrder({
        salesOrderId: 2_147_483_648
      })
    ).rejects.toBeInstanceOf(ServiceError);

    expect(mocks.client.get).not.toHaveBeenCalled();
    expect(mocks.client.list).not.toHaveBeenCalled();
  });
});
