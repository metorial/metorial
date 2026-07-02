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
  getPurchaseInvoice,
  getSalesInvoice,
  listPurchaseInvoices,
  salesInvoicePdfContentPath
} from './invoices';

let invokeGetSalesInvoice = (input: Record<string, unknown>) =>
  getSalesInvoice.handleInvocation({
    auth: { businessCentralToken: 'token' },
    config: { businessCentralCompanyId: '11111111-1111-1111-1111-111111111111' },
    input
  } as any);

let invokeListPurchaseInvoices = (input: Record<string, unknown>) =>
  listPurchaseInvoices.handleInvocation({
    auth: { businessCentralToken: 'token' },
    config: { businessCentralCompanyId: '11111111-1111-1111-1111-111111111111' },
    input
  } as any);

let invokeGetPurchaseInvoice = (input: Record<string, unknown>) =>
  getPurchaseInvoice.handleInvocation({
    auth: { businessCentralToken: 'token' },
    config: { businessCentralCompanyId: '11111111-1111-1111-1111-111111111111' },
    input
  } as any);

beforeEach(() => {
  axiosMocks.api.get.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReturnValue(axiosMocks.api);
});

describe('salesInvoicePdfContentPath', () => {
  it('uses the documented pdfDocument media stream path', () => {
    expect(
      salesInvoicePdfContentPath(
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222'
      )
    ).toBe(
      '/companies(11111111-1111-1111-1111-111111111111)/salesInvoices(22222222-2222-2222-2222-222222222222)/pdfDocument/pdfDocumentContent'
    );
  });
});

describe('Business Central get sales invoice', () => {
  it('uses the documented entity path, maps documented fields, and strips expanded attachment content', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        id: '22222222-2222-2222-2222-222222222222',
        number: 'PS-INV103001',
        externalDocumentNumber: 'EXT-100',
        invoiceDate: '2026-01-15',
        postingDate: '2026-01-15',
        dueDate: '2026-02-15',
        promisedPayDate: '2026-02-01',
        customerPurchaseOrderReference: 'PO-123',
        customerId: '33333333-3333-3333-3333-333333333333',
        customerNumber: '20000',
        customerName: 'Trey Research',
        billToName: 'Trey Research',
        billToCustomerId: '33333333-3333-3333-3333-333333333333',
        billToCustomerNumber: '20000',
        shipToName: 'Trey Research Warehouse',
        shipToContact: 'Helen Ray',
        sellToAddressLine1: '153 Thomas Drive',
        sellToAddressLine2: 'Suite 1',
        sellToCity: 'Chicago',
        sellToCountry: 'US',
        sellToState: 'IL',
        sellToPostCode: '61236',
        billToAddressLine1: '153 Thomas Drive',
        billToAddressLine2: 'Suite 1',
        billToCity: 'Chicago',
        billToCountry: 'US',
        billToState: 'IL',
        billToPostCode: '61236',
        shipToAddressLine1: '200 Warehouse Ave',
        shipToAddressLine2: '',
        shipToCity: 'Chicago',
        shipToCountry: 'US',
        shipToState: 'IL',
        shipToPostCode: '61236',
        currencyId: '00000000-0000-0000-0000-000000000000',
        shortcutDimension1Code: 'SALES',
        shortcutDimension2Code: 'NORTH',
        currencyCode: 'USD',
        orderId: '44444444-4444-4444-4444-444444444444',
        orderNumber: 'SO-100',
        paymentTermsId: '55555555-5555-5555-5555-555555555555',
        shipmentMethodId: '66666666-6666-6666-6666-666666666666',
        salesperson: 'PS',
        disputeStatusId: '77777777-7777-7777-7777-777777777777',
        disputeStatus: 'Open',
        pricesIncludeTax: false,
        remainingAmount: 0,
        discountAmount: 10,
        discountAppliedBeforeTax: true,
        totalAmountExcludingTax: 164.7,
        totalTaxAmount: 8.24,
        totalAmountIncludingTax: 172.94,
        status: 'Paid',
        lastModifiedDateTime: '2026-01-16T00:25:58.337Z',
        phoneNumber: '555-0100',
        email: 'helen.ray@example.com',
        salesInvoiceLines: {
          value: [
            {
              id: '88888888-8888-8888-8888-888888888888',
              documentId: '22222222-2222-2222-2222-222222222222',
              sequence: 10000,
              itemId: '99999999-9999-9999-9999-999999999999',
              accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              lineType: 'Item',
              lineObjectNumber: '1896-S',
              description: 'ATHENS Desk',
              description2: 'Black',
              unitOfMeasureId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
              unitOfMeasureCode: 'PCS',
              quantity: 2,
              unitPrice: 100,
              discountAmount: 5,
              discountPercent: 2.5,
              discountAppliedBeforeTax: true,
              amountExcludingTax: 195,
              taxCode: 'TAX',
              taxPercent: 5,
              totalTaxAmount: 9.75,
              amountIncludingTax: 204.75,
              invoiceDiscountAllocation: 1,
              netAmount: 194,
              netTaxAmount: 9.7,
              netAmountIncludingTax: 203.7,
              shipmentDate: '2026-01-20',
              itemVariantId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
              locationId: 'dddddddd-dddd-dddd-dddd-dddddddddddd'
            }
          ]
        },
        dimensionSetLines: {
          value: [
            {
              id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
              code: 'DEPARTMENT',
              displayName: 'Department',
              valueCode: 'SALES',
              valueDisplayName: 'Sales'
            }
          ]
        },
        attachments: {
          value: [
            {
              id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
              fileName: 'invoice.pdf',
              byteSize: 128,
              attachmentContent: 'JVBERi0x'
            }
          ]
        },
        documentAttachments: [
          {
            id: '12121212-1212-1212-1212-121212121212',
            fileName: 'invoice-note.pdf',
            byteSize: 64,
            attachmentContent: 'JVBERi0x'
          }
        ]
      }
    });

    let result = await invokeGetSalesInvoice({
      invoiceId: '22222222-2222-2222-2222-222222222222',
      select: ['id', 'number'],
      expandLines: true,
      expandCustomer: true,
      expandDimensions: true,
      expandPdfDocument: true,
      expandAttachments: true
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/salesInvoices(22222222-2222-2222-2222-222222222222)',
      {
        params: {
          $select: 'id,number',
          $expand:
            'salesInvoiceLines,customer,dimensionSetLines,pdfDocument,attachments,documentAttachments'
        }
      }
    );
    expect(result.output).toMatchObject({
      id: '22222222-2222-2222-2222-222222222222',
      number: 'PS-INV103001',
      promisedPayDate: '2026-02-01',
      customerPurchaseOrderReference: 'PO-123',
      billToCustomerNumber: '20000',
      shipToContact: 'Helen Ray',
      shortcutDimension1Code: 'SALES',
      orderNumber: 'SO-100',
      paymentTermsId: '55555555-5555-5555-5555-555555555555',
      salesperson: 'PS',
      disputeStatus: 'Open',
      discountAppliedBeforeTax: true,
      phoneNumber: '555-0100',
      email: 'helen.ray@example.com',
      lines: [
        {
          id: '88888888-8888-8888-8888-888888888888',
          documentId: '22222222-2222-2222-2222-222222222222',
          itemId: '99999999-9999-9999-9999-999999999999',
          accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          description2: 'Black',
          unitOfMeasureCode: 'PCS',
          discountAppliedBeforeTax: true,
          invoiceDiscountAllocation: 1,
          netAmountIncludingTax: 203.7,
          shipmentDate: '2026-01-20',
          locationId: 'dddddddd-dddd-dddd-dddd-dddddddddddd'
        }
      ],
      dimensions: [
        {
          code: 'DEPARTMENT',
          valueCode: 'SALES'
        }
      ]
    });

    let output = result.output as any;
    expect(output.record.attachments.value[0]).not.toHaveProperty('attachmentContent');
    expect(output.record.documentAttachments[0]).not.toHaveProperty('attachmentContent');
    expect(JSON.stringify(output.record)).not.toContain('JVBERi0x');
  });
});

describe('Business Central list purchase invoices', () => {
  it('uses the documented collection path, filters, expansion, and maps documented fields', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: [
          {
            id: '22222222-2222-2222-2222-222222222222',
            number: '108001',
            invoiceDate: '2026-01-15',
            postingDate: '2026-01-16',
            dueDate: '2026-02-15',
            vendorInvoiceNumber: 'V-107001',
            vendorId: '33333333-3333-3333-3333-333333333333',
            vendorNumber: '20000',
            vendorName: 'First Up Consultants',
            payToName: 'First Up Consultants',
            payToContact: 'Evan McIntosh',
            payToVendorId: '33333333-3333-3333-3333-333333333333',
            payToVendorNumber: '20000',
            shipToName: 'Atlanta Warehouse',
            shipToContact: 'April Meyer',
            buyFromAddressLine1: '100 Day Drive',
            buyFromAddressLine2: 'Suite 100',
            buyFromCity: 'Chicago',
            buyFromCountry: 'US',
            buyFromState: 'IL',
            buyFromPostCode: '61236',
            shipToAddressLine1: '7122 South Ashford Street',
            shipToAddressLine2: 'Westminster',
            shipToCity: 'Atlanta',
            shipToCountry: 'US',
            shipToState: 'GA',
            shipToPostCode: '31772',
            payToAddressLine1: '100 Day Drive',
            payToAddressLine2: '',
            payToCity: 'Chicago',
            payToCountry: 'US',
            payToState: 'IL',
            payToPostCode: '61236',
            shortcutDimension1Code: 'PURCHASE',
            shortcutDimension2Code: 'SOUTH',
            currencyId: '00000000-0000-0000-0000-000000000000',
            currencyCode: 'USD',
            orderId: '44444444-4444-4444-4444-444444444444',
            orderNumber: 'PO-100',
            purchaser: 'AH',
            pricesIncludeTax: false,
            discountAmount: 10,
            discountAppliedBeforeTax: true,
            totalAmountExcludingTax: 3122.8,
            totalTaxAmount: 187.37,
            totalAmountIncludingTax: 3310.17,
            status: 'Open',
            lastModifiedDateTime: '2026-01-17T00:26:53.793Z',
            purchaseInvoiceLines: {
              value: [
                {
                  id: '55555555-5555-5555-5555-555555555555',
                  documentId: '22222222-2222-2222-2222-222222222222',
                  sequence: 10000,
                  accountId: '66666666-6666-6666-6666-666666666666',
                  lineType: 'Account',
                  description: 'Consulting services',
                  quantity: 1,
                  unitCost: 3122.8,
                  amountExcludingTax: 3122.8,
                  totalTaxAmount: 187.37,
                  amountIncludingTax: 3310.17
                }
              ]
            }
          }
        ],
        '@odata.nextLink':
          'https://api.businesscentral.dynamics.com/v2.0/production/api/v2.0/companies(11111111-1111-1111-1111-111111111111)/purchaseInvoices?$skip=10'
      }
    });

    let result = await invokeListPurchaseInvoices({
      vendorId: '33333333-3333-3333-3333-333333333333',
      status: 'Open',
      invoiceDateFrom: '2026-01-01',
      dueDateTo: '2026-02-28',
      updatedSince: '2026-01-15T00:00:00Z',
      odataFilter: 'totalAmountIncludingTax gt 0',
      expandLines: true,
      expandVendor: true,
      expand: ['dimensionSetLines'],
      limit: 5,
      skip: 5
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/purchaseInvoices',
      {
        params: {
          $top: 5,
          $skip: 5,
          $expand: 'purchaseInvoiceLines,vendor,dimensionSetLines',
          $filter:
            "(status eq 'Open') and (vendorId eq 33333333-3333-3333-3333-333333333333) and (invoiceDate ge 2026-01-01) and (dueDate le 2026-02-28) and (lastModifiedDateTime ge 2026-01-15T00:00:00Z) and (totalAmountIncludingTax gt 0)"
        }
      }
    );
    expect(result.output.purchaseInvoices[0]).toMatchObject({
      id: '22222222-2222-2222-2222-222222222222',
      number: '108001',
      vendorInvoiceNumber: 'V-107001',
      vendorId: '33333333-3333-3333-3333-333333333333',
      vendorName: 'First Up Consultants',
      payToContact: 'Evan McIntosh',
      payToVendorNumber: '20000',
      shipToName: 'Atlanta Warehouse',
      shipToContact: 'April Meyer',
      buyFromAddressLine1: '100 Day Drive',
      shipToCity: 'Atlanta',
      payToCity: 'Chicago',
      shortcutDimension1Code: 'PURCHASE',
      shortcutDimension2Code: 'SOUTH',
      orderId: '44444444-4444-4444-4444-444444444444',
      orderNumber: 'PO-100',
      purchaser: 'AH',
      pricesIncludeTax: false,
      discountAppliedBeforeTax: true,
      totalAmountIncludingTax: 3310.17,
      status: 'Open',
      lines: [
        {
          id: '55555555-5555-5555-5555-555555555555',
          accountId: '66666666-6666-6666-6666-666666666666',
          lineType: 'Account',
          unitCost: 3122.8,
          amountIncludingTax: 3310.17
        }
      ]
    });
    expect(result.output.page).toMatchObject({
      count: 1,
      limit: 5,
      skip: 5,
      nextSkip: 10
    });
  });
});

describe('Business Central get purchase invoice', () => {
  it('uses the documented entity path, expansion, and maps purchase invoice line fields', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        id: '22222222-2222-2222-2222-222222222222',
        number: '108001',
        invoiceDate: '2026-01-15',
        postingDate: '2026-01-16',
        dueDate: '2026-02-15',
        vendorInvoiceNumber: 'V-107001',
        vendorId: '33333333-3333-3333-3333-333333333333',
        vendorNumber: '20000',
        vendorName: 'First Up Consultants',
        payToName: 'First Up Consultants',
        payToContact: 'Evan McIntosh',
        payToVendorId: '33333333-3333-3333-3333-333333333333',
        payToVendorNumber: '20000',
        shipToName: 'Atlanta Warehouse',
        shipToContact: 'April Meyer',
        shortcutDimension1Code: 'PURCHASE',
        shortcutDimension2Code: 'SOUTH',
        currencyId: '00000000-0000-0000-0000-000000000000',
        currencyCode: 'USD',
        orderId: '44444444-4444-4444-4444-444444444444',
        orderNumber: 'PO-100',
        purchaser: 'AH',
        pricesIncludeTax: false,
        discountAmount: 10,
        discountAppliedBeforeTax: true,
        totalAmountExcludingTax: 3122.8,
        totalTaxAmount: 187.37,
        totalAmountIncludingTax: 3310.17,
        status: 'Open',
        lastModifiedDateTime: '2026-01-17T00:26:53.793Z',
        purchaseInvoiceLines: {
          value: [
            {
              id: '55555555-5555-5555-5555-555555555555',
              documentId: '22222222-2222-2222-2222-222222222222',
              sequence: 10000,
              accountId: '66666666-6666-6666-6666-666666666666',
              lineType: 'Account',
              description: 'Consulting services',
              quantity: 1,
              unitCost: 3122.8,
              discountAmount: 5,
              discountPercent: 1.5,
              discountAppliedBeforeTax: true,
              taxCode: 'VAT',
              taxPercent: 6,
              amountExcludingTax: 3122.8,
              totalTaxAmount: 187.37,
              amountIncludingTax: 3310.17,
              invoiceDiscountAllocation: 2,
              netAmount: 3117.8,
              netTaxAmount: 187.07,
              netAmountIncludingTax: 3304.87,
              expectedReceiptDate: '2026-01-20'
            }
          ]
        },
        dimensionSetLines: {
          value: [
            {
              id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
              code: 'DEPARTMENT',
              displayName: 'Department',
              valueCode: 'PURCHASE',
              valueDisplayName: 'Purchase'
            }
          ]
        }
      }
    });

    let result = await invokeGetPurchaseInvoice({
      purchaseInvoiceId: '22222222-2222-2222-2222-222222222222',
      select: ['id', 'number'],
      expandLines: true,
      expandVendor: true,
      expandDimensions: true
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/purchaseInvoices(22222222-2222-2222-2222-222222222222)',
      {
        params: {
          $select: 'id,number',
          $expand: 'purchaseInvoiceLines,vendor,dimensionSetLines'
        }
      }
    );
    expect(result.output).toMatchObject({
      id: '22222222-2222-2222-2222-222222222222',
      number: '108001',
      vendorInvoiceNumber: 'V-107001',
      vendorId: '33333333-3333-3333-3333-333333333333',
      vendorName: 'First Up Consultants',
      payToContact: 'Evan McIntosh',
      payToVendorNumber: '20000',
      shortcutDimension1Code: 'PURCHASE',
      shortcutDimension2Code: 'SOUTH',
      orderId: '44444444-4444-4444-4444-444444444444',
      orderNumber: 'PO-100',
      purchaser: 'AH',
      pricesIncludeTax: false,
      discountAppliedBeforeTax: true,
      totalAmountIncludingTax: 3310.17,
      status: 'Open',
      lines: [
        {
          id: '55555555-5555-5555-5555-555555555555',
          accountId: '66666666-6666-6666-6666-666666666666',
          lineType: 'Account',
          unitCost: 3122.8,
          expectedReceiptDate: '2026-01-20',
          netAmountIncludingTax: 3304.87
        }
      ],
      dimensions: [
        {
          code: 'DEPARTMENT',
          valueCode: 'PURCHASE'
        }
      ]
    });

    expect(result.output.lines?.[0]).not.toHaveProperty('unitPrice');
    expect(result.output.lines?.[0]).not.toHaveProperty('shipmentDate');
  });
});
