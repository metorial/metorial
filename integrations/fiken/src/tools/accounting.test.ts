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
  detailedPurchaseSchema,
  detailedSaleSchema,
  getAccountBalance,
  getSale,
  listPurchases,
  listSales,
  mapDetailedPurchase,
  mapDetailedSale
} from './accounting';

let invokeListPurchases = (input: Record<string, unknown>) =>
  listPurchases.handleInvocation({
    auth: { token: 'token' },
    config: {},
    input
  } as any);

let invokeListSales = (input: Record<string, unknown>) =>
  listSales.handleInvocation({
    auth: { token: 'token' },
    config: {},
    input
  } as any);

let invokeGetSale = (input: Record<string, unknown>) =>
  getSale.handleInvocation({
    auth: { token: 'token' },
    config: {},
    input
  } as any);

let invokeGetAccountBalance = (input: Record<string, unknown>) =>
  getAccountBalance.handleInvocation({
    auth: { token: 'token' },
    config: {},
    input
  } as any);

beforeEach(() => {
  axiosMocks.api.get.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReturnValue(axiosMocks.api);
});

describe('list_purchases', () => {
  it('sends documented strict date filters to Fiken', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: [],
      headers: {
        'Fiken-Api-Page': '0',
        'Fiken-Api-Page-Size': '10',
        'Fiken-Api-Page-Count': '1',
        'Fiken-Api-Result-Count': '0'
      }
    });

    await invokeListPurchases({
      companySlug: 'demo-company',
      page: 0,
      pageSize: 10,
      dateAfter: '2024-01-01',
      dateBefore: '2024-02-01',
      settledDateAfter: '2024-03-01',
      settledDateBefore: '2024-04-01',
      sortBy: 'date desc'
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies/demo-company/purchases',
      expect.objectContaining({
        params: expect.objectContaining({
          page: 0,
          pageSize: 10,
          dateGt: '2024-01-01',
          dateLt: '2024-02-01',
          settledDateGt: '2024-03-01',
          settledDateLt: '2024-04-01',
          sortBy: 'date desc'
        }),
        headers: {
          'X-Request-ID': expect.any(String)
        }
      })
    );
  });
});

describe('list_sales', () => {
  it('sends documented strict date filters to Fiken', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: [],
      headers: {
        'Fiken-Api-Page': '0',
        'Fiken-Api-Page-Size': '10',
        'Fiken-Api-Page-Count': '1',
        'Fiken-Api-Result-Count': '0'
      }
    });

    await invokeListSales({
      companySlug: 'demo-company',
      page: 0,
      pageSize: 10,
      dateAfter: '2024-01-01',
      dateBefore: '2024-02-01',
      lastModifiedAfter: '2024-03-01',
      lastModifiedBefore: '2024-04-01'
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies/demo-company/sales',
      expect.objectContaining({
        params: expect.objectContaining({
          page: 0,
          pageSize: 10,
          dateGt: '2024-01-01',
          dateLt: '2024-02-01',
          lastModifiedGt: '2024-03-01',
          lastModifiedLt: '2024-04-01'
        }),
        headers: {
          'X-Request-ID': expect.any(String)
        }
      })
    );
  });
});

describe('get_sale', () => {
  it('requests the documented sale endpoint without query parameters', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        saleId: 2888156,
        saleNumber: 'XK455L',
        lines: [],
        salePayments: [],
        saleAttachments: [],
        notes: []
      },
      headers: {}
    });

    await invokeGetSale({
      companySlug: 'demo-company',
      saleId: 2888156
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies/demo-company/sales/2888156',
      expect.objectContaining({
        params: {},
        headers: {
          'X-Request-ID': expect.any(String)
        }
      })
    );
  });
});

describe('get_account_balance', () => {
  it('requests the documented account balance endpoint with required date query', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        code: '1500:10001',
        name: 'Acme AS',
        balance: 15200
      },
      headers: {}
    });

    let result = await invokeGetAccountBalance({
      companySlug: 'demo-company',
      accountCode: '1500:10001',
      date: '2024-12-31'
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies/demo-company/accountBalances/1500%3A10001',
      expect.objectContaining({
        params: {
          date: '2024-12-31'
        },
        headers: {
          'X-Request-ID': expect.any(String)
        }
      })
    );
    expect(result.output.balance).toMatchObject({
      code: '1500:10001',
      name: 'Acme AS',
      balance: 15200
    });
  });

  it('rejects an invalid date before calling Fiken', async () => {
    await expect(
      invokeGetAccountBalance({
        companySlug: 'demo-company',
        accountCode: '3020',
        date: '2024-02-31'
      })
    ).rejects.toThrow('date must be a valid date formatted as YYYY-MM-DD.');

    expect(axiosMocks.api.get).not.toHaveBeenCalled();
  });
});

describe('mapDetailedPurchase', () => {
  it('maps documented getPurchase purchaseResult detail fields', () => {
    let purchase = detailedPurchaseSchema.parse(
      mapDetailedPurchase({
        purchaseId: 2888156,
        transactionId: 3458156,
        identifier: 'INV-123',
        date: '2018-04-03',
        dueDate: '2018-04-17',
        kind: 'supplier',
        paid: true,
        settled: true,
        settledDate: '2024-04-03',
        currency: 'NOK',
        paymentAccount: '1920:10001',
        kid: '5855454756',
        supplier: {
          contactId: 2747365,
          name: 'Fiken AS'
        },
        lines: [
          {
            lineId: 2888157,
            description: 'Software subscription',
            netPrice: 4500,
            vat: 500,
            account: '6550',
            vatType: 'HIGH',
            netPriceInCurrency: 4500,
            vatInCurrency: 500,
            projectId: 2815556
          }
        ],
        payments: [
          {
            paymentId: 2888158,
            date: '2018-04-03',
            account: '1920:10001',
            amount: 5000,
            amountInNok: 5000,
            currency: 'NOK',
            fee: 25
          }
        ],
        purchaseAttachments: [
          {
            identifier: '24760',
            downloadUrl: 'https://api.fiken.no/api/v2/files/example.pdf',
            downloadUrlWithFikenNormalUserCredentials: 'https://fiken.no/files/example.pdf',
            comment: 'Receipt',
            type: 'invoice'
          }
        ],
        project: [
          {
            projectId: 2815556,
            number: 'P-1',
            name: 'Implementation',
            description: 'Client work',
            startDate: '2018-04-03',
            endDate: '2018-04-17',
            contact: {
              contactId: 2747365,
              name: 'Fiken AS'
            },
            completed: false
          }
        ],
        deleted: false
      })
    );

    expect(purchase).toMatchObject({
      purchaseId: 2888156,
      supplierId: 2747365,
      supplierName: 'Fiken AS',
      paymentAccount: '1920:10001',
      kid: '5855454756',
      lineCount: 1,
      paymentCount: 1,
      attachmentCount: 1,
      lines: [
        {
          lineId: 2888157,
          description: 'Software subscription',
          account: '6550',
          vatType: 'HIGH',
          projectId: 2815556
        }
      ],
      payments: [
        {
          paymentId: 2888158,
          account: '1920:10001',
          amount: 5000,
          amountInNok: 5000,
          fee: 25
        }
      ],
      attachments: [
        {
          identifier: '24760',
          comment: 'Receipt',
          type: 'invoice'
        }
      ],
      projects: [
        {
          projectId: 2815556,
          number: 'P-1',
          name: 'Implementation',
          contactId: 2747365,
          contactName: 'Fiken AS',
          completed: false
        }
      ]
    });
  });
});

describe('mapDetailedSale', () => {
  it('maps documented getSale saleResult detail fields', () => {
    let sale = detailedSaleSchema.parse(
      mapDetailedSale({
        saleId: 2888156,
        lastModifiedDate: '2018-04-03',
        transactionId: 3458156,
        saleNumber: 'XK455L',
        date: '2018-04-03',
        dueDate: '2018-04-17',
        kind: 'external_invoice',
        netAmount: 4500,
        vatAmount: 5400,
        settled: true,
        settledDate: '2023-04-03',
        writeOff: false,
        totalPaid: 524500,
        totalPaidInCurrency: 634550,
        outstandingBalance: 145,
        outstandingBalanceInCurrency: 65,
        currency: 'NOK',
        kid: '5855454756',
        paymentAccount: '1920:10001',
        paymentDate: '2018-04-03',
        customer: {
          contactId: 2747365,
          name: 'Fiken AS'
        },
        lines: [
          {
            lineId: 2888157,
            description: 'Consulting',
            netPrice: 4500,
            vat: 500,
            account: '3000',
            vatType: 'HIGH',
            netPriceInCurrency: 4500,
            vatInCurrency: 500
          }
        ],
        salePayments: [
          {
            paymentId: 2888158,
            date: '2018-04-03',
            account: '1920:10001',
            amount: 5000,
            amountInNok: 5000,
            currency: 'NOK',
            fee: 25
          }
        ],
        saleAttachments: [
          {
            identifier: '24760',
            downloadUrl: 'https://api.fiken.no/api/v2/files/example.pdf',
            downloadUrlWithFikenNormalUserCredentials: 'https://fiken.no/files/example.pdf',
            comment: 'Invoice',
            type: 'invoice'
          }
        ],
        project: {
          projectId: 2815556,
          number: 'P-1',
          name: 'Implementation',
          description: 'Client work',
          startDate: '2018-04-03',
          endDate: '2018-04-17',
          contact: {
            contactId: 2747365,
            name: 'Fiken AS'
          },
          completed: false
        },
        notes: [
          {
            author: 'James Jones',
            note: 'Invoice sent after telephone conversation with customer'
          }
        ],
        deleted: false
      })
    );

    expect(sale).toMatchObject({
      saleId: 2888156,
      lastModifiedDate: '2018-04-03',
      saleNumber: 'XK455L',
      customerId: 2747365,
      customerName: 'Fiken AS',
      totalPaidInCurrency: 634550,
      outstandingBalanceInCurrency: 65,
      kid: '5855454756',
      paymentAccount: '1920:10001',
      paymentDate: '2018-04-03',
      lineCount: 1,
      paymentCount: 1,
      attachmentCount: 1,
      lines: [
        {
          lineId: 2888157,
          description: 'Consulting',
          account: '3000',
          vatType: 'HIGH'
        }
      ],
      payments: [
        {
          paymentId: 2888158,
          account: '1920:10001',
          amount: 5000,
          amountInNok: 5000,
          fee: 25
        }
      ],
      attachments: [
        {
          identifier: '24760',
          comment: 'Invoice',
          type: 'invoice'
        }
      ],
      project: {
        projectId: 2815556,
        number: 'P-1',
        name: 'Implementation',
        contactId: 2747365,
        contactName: 'Fiken AS',
        completed: false
      },
      notes: [
        {
          author: 'James Jones',
          note: 'Invoice sent after telephone conversation with customer'
        }
      ]
    });
  });
});
