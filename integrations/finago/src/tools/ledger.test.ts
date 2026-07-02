import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  finagoGetAccountBalances,
  finagoListTransactionLines,
  finagoPostTransaction
} from './ledger';

let mocks = vi.hoisted(() => ({
  client: {
    get: vi.fn(),
    list: vi.fn(),
    post: vi.fn()
  }
}));

vi.mock('../lib/helpers', () => ({
  createClientFromContext: () => mocks.client
}));

describe('finago_list_transaction_lines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes documented filters and pagination to /transactionlines', async () => {
    let record = { id: '123e4567-e89b-12d3-a456-426614174001' };
    mocks.client.list.mockResolvedValue({
      records: [record],
      count: 1,
      pageCount: 2,
      hasNextPage: true,
      nextLink: 'https://rest.api.24sevenoffice.com/v1/transactionlines?page=3'
    });

    let result = await finagoListTransactionLines.handleInvocation({
      input: {
        dateFrom: '2024-01-01',
        dateTo: '2024-02-01',
        createdFrom: '2024-01-02T03:04:05Z',
        modifiedFrom: '2024-01-03T04:05:06+01:00',
        transactionId: '123e4567-e89b-12d3-a456-426614174002',
        transactionNumber: 1001,
        transactionTypeId: 5001,
        customerId: 6001,
        accountId: 1000001,
        accountNumber: 1900,
        invoiceNumber: 'INV-2024-001',
        currencyCode: 'NOK',
        includeDimensions: true,
        page: 2,
        limit: 10,
        maxPages: 3
      }
    } as any);

    expect(mocks.client.list).toHaveBeenCalledWith(
      '/transactionlines',
      {
        dateFrom: '2024-01-01',
        dateTo: '2024-02-01',
        createdFrom: '2024-01-02T03:04:05Z',
        modifiedFrom: '2024-01-03T04:05:06+01:00',
        transactionId: '123e4567-e89b-12d3-a456-426614174002',
        transactionNumber: 1001,
        transactionTypeId: 5001,
        customerId: 6001,
        accountId: 1000001,
        accountNumber: 1900,
        invoiceNumber: 'INV-2024-001',
        currencyCode: 'NOK',
        includeDimensions: true,
        page: 2,
        limit: 10
      },
      3,
      'list transaction lines'
    );
    expect(result.output).toEqual({
      transactionLines: [record],
      count: 1,
      pageCount: 2,
      hasNextPage: true,
      nextLink: 'https://rest.api.24sevenoffice.com/v1/transactionlines?page=3'
    });
  });

  it('rejects malformed required date range before calling Finago', async () => {
    await expect(
      finagoListTransactionLines.handleInvocation({
        input: {
          dateFrom: '2024-02-30',
          dateTo: '2024-03-01'
        }
      } as any)
    ).rejects.toThrow('dateFrom must be a valid date in YYYY-MM-DD format.');

    expect(mocks.client.list).not.toHaveBeenCalled();
  });

  it('requires the exclusive end date to be later than the start date', async () => {
    await expect(
      finagoListTransactionLines.handleInvocation({
        input: {
          dateFrom: '2024-02-01',
          dateTo: '2024-02-01'
        }
      } as any)
    ).rejects.toThrow(
      'dateTo must be later than dateFrom because Finago treats dateTo as exclusive.'
    );

    expect(mocks.client.list).not.toHaveBeenCalled();
  });

  it('rejects malformed created and modified date-time filters before calling Finago', async () => {
    await expect(
      finagoListTransactionLines.handleInvocation({
        input: {
          dateFrom: '2024-01-01',
          dateTo: '2024-02-01',
          createdFrom: '2024-01-01'
        }
      } as any)
    ).rejects.toThrow('createdFrom must be a valid ISO 8601 date-time.');

    await expect(
      finagoListTransactionLines.handleInvocation({
        input: {
          dateFrom: '2024-01-01',
          dateTo: '2024-02-01',
          modifiedFrom: 'not-a-date-time'
        }
      } as any)
    ).rejects.toThrow('modifiedFrom must be a valid ISO 8601 date-time.');

    expect(mocks.client.list).not.toHaveBeenCalled();
  });

  it('rejects malformed transactionId before calling Finago', async () => {
    await expect(
      finagoListTransactionLines.handleInvocation({
        input: {
          dateFrom: '2024-01-01',
          dateTo: '2024-02-01',
          transactionId: 'not-a-uuid'
        }
      } as any)
    ).rejects.toThrow('transactionId must be a valid UUID.');

    expect(mocks.client.list).not.toHaveBeenCalled();
  });
});

describe('finago_get_account_balances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes documented filters to account-specific /accountbalances/{id}', async () => {
    let record = {
      account: { id: 1000001, number: 1900, name: 'Cash, NOK' },
      balances: [{ date: '2024-01-01', opening: 50000, closing: 55000, change: 5000 }]
    };
    mocks.client.get.mockResolvedValue([record]);

    let result = await finagoGetAccountBalances.handleInvocation({
      input: {
        dateFrom: '2024-01-01',
        dateTo: '2024-02-01',
        accountId: 1000001,
        periods: '2024-01-01,2024-02-01Z',
        type: 'Period',
        keepIncoming: true
      }
    } as any);

    expect(mocks.client.get).toHaveBeenCalledWith(
      '/accountbalances/1000001',
      {
        dateFrom: '2024-01-01',
        dateTo: '2024-02-01',
        periods: '2024-01-01,2024-02-01Z',
        type: 'Period',
        keepIncoming: true
      },
      'get account balances'
    );
    expect(result.output).toEqual({
      balances: [record],
      count: 1,
      beginningAt: undefined,
      endingAt: undefined,
      fiscals: undefined
    });
  });

  it('normalizes documented HAL account balance responses', async () => {
    let record = {
      account: { id: 1000002, number: 1920, name: 'Bank Account' },
      balances: [{ date: '2024-01-01', opening: 80000, closing: 85000, change: 5000 }]
    };
    let fiscals = [{ startingDate: '2024-01-01', endingAt: '2024-12-31' }];
    mocks.client.get.mockResolvedValue({
      _embedded: { records: [record] },
      beginningAt: '2024-01-01',
      endingAt: '2024-02-01',
      fiscals
    });

    let result = await finagoGetAccountBalances.handleInvocation({
      input: {
        dateFrom: '2024-01-01',
        dateTo: '2024-02-01'
      }
    } as any);

    expect(mocks.client.get).toHaveBeenCalledWith(
      '/accountbalances',
      {
        dateFrom: '2024-01-01',
        dateTo: '2024-02-01',
        periods: undefined,
        type: undefined,
        keepIncoming: undefined
      },
      'get account balances'
    );
    expect(result.output).toEqual({
      balances: [record],
      count: 1,
      beginningAt: '2024-01-01',
      endingAt: '2024-02-01',
      fiscals
    });
  });

  it('rejects malformed dates and periods before calling Finago', async () => {
    await expect(
      finagoGetAccountBalances.handleInvocation({
        input: {
          dateFrom: '2024-02-30',
          dateTo: '2024-03-01'
        }
      } as any)
    ).rejects.toThrow('dateFrom must be a valid date in YYYY-MM-DD format.');

    await expect(
      finagoGetAccountBalances.handleInvocation({
        input: {
          dateFrom: '2024-03-01',
          dateTo: '2024-02-01'
        }
      } as any)
    ).rejects.toThrow('dateTo must be the same as or later than dateFrom.');

    await expect(
      finagoGetAccountBalances.handleInvocation({
        input: {
          dateFrom: '2024-01-01',
          dateTo: '2024-02-01',
          periods: '2024-01-01,2024-02-30'
        }
      } as any)
    ).rejects.toThrow(
      'periods must be a comma-separated list of valid dates in YYYY-MM-DD format'
    );

    expect(mocks.client.get).not.toHaveBeenCalled();
  });
});

describe('finago_post_transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the documented /transactions request body and returns transactionId', async () => {
    let record = { transactionId: 'abc123' };
    mocks.client.post.mockResolvedValue(record);

    let result = await finagoPostTransaction.handleInvocation({
      input: {
        confirm: true,
        transactionTypeNumber: 1,
        date: '2025-04-09',
        comment: 'Invoice #12345',
        documentId: 12345,
        lines: [
          {
            accountNumber: 1920,
            amount: 1500,
            taxNumber: 0,
            comment: 'Payment for services',
            periodDate: '2025-04-01',
            currencyCode: 'USD',
            currencyRate: 10.5,
            dimensions: [{ dimensionType: 1, value: '13' }],
            invoiceNumber: 'INV-12345',
            invoiceDueDate: '2025-05-05',
            invoiceRemittanceReference: '1234567890',
            invoiceBankAccount: '1234.56.78901'
          },
          {
            accountNumber: 3000,
            amount: -1500,
            taxNumber: 1,
            taxAmount: -300,
            taxBaseRate: 50,
            taxSpecificationNumber: 10
          }
        ],
        additionalFields: {
          externalReference: 'slates-test-transaction'
        }
      }
    } as any);

    expect(mocks.client.post).toHaveBeenCalledWith(
      '/transactions',
      {
        transactionTypeNumber: 1,
        date: '2025-04-09',
        comment: 'Invoice #12345',
        documentId: 12345,
        lines: [
          {
            accountNumber: 1920,
            amount: 1500,
            tax: { number: 0 },
            comment: 'Payment for services',
            periodDate: '2025-04-01',
            dimensions: [{ dimensionType: 1, value: '13' }],
            currency: { code: 'USD', rate: 10.5 },
            invoice: {
              number: 'INV-12345',
              dueDate: '2025-05-05',
              remittanceReference: '1234567890',
              bankAccount: '1234.56.78901'
            }
          },
          {
            accountNumber: 3000,
            amount: -1500,
            tax: {
              number: 1,
              amount: -300,
              baseRate: 50,
              specificationNumber: 10
            }
          }
        ],
        externalReference: 'slates-test-transaction'
      },
      undefined,
      'post transaction'
    );
    expect(result.output).toEqual({ transactionId: 'abc123', record });
  });

  it('requires explicit confirmation before posting', async () => {
    await expect(
      finagoPostTransaction.handleInvocation({
        input: {
          confirm: false,
          transactionTypeNumber: 1,
          date: '2025-04-09',
          lines: [
            { accountNumber: 1920, amount: 100, taxNumber: 0 },
            { accountNumber: 3000, amount: -100, taxNumber: 0 }
          ]
        }
      } as any)
    ).rejects.toThrow('confirm must be true to post a transaction.');

    expect(mocks.client.post).not.toHaveBeenCalled();
  });

  it('requires lines to balance to zero per effective transaction date', async () => {
    await expect(
      finagoPostTransaction.handleInvocation({
        input: {
          confirm: true,
          transactionTypeNumber: 1,
          date: '2025-04-09',
          lines: [
            { accountNumber: 1920, amount: 100, taxNumber: 0 },
            { accountNumber: 3000, amount: -100, taxNumber: 0, date: '2025-04-10' }
          ]
        }
      } as any)
    ).rejects.toThrow(
      'Transaction lines must balance to zero per date; 2025-04-09 balances to 100.'
    );

    expect(mocks.client.post).not.toHaveBeenCalled();
  });

  it('validates documented date and currency constraints before posting', async () => {
    await expect(
      finagoPostTransaction.handleInvocation({
        input: {
          confirm: true,
          transactionTypeNumber: 1,
          date: '2025-02-30',
          lines: [
            { accountNumber: 1920, amount: 100, taxNumber: 0 },
            { accountNumber: 3000, amount: -100, taxNumber: 0 }
          ]
        }
      } as any)
    ).rejects.toThrow('date must be a valid date in YYYY-MM-DD format.');

    await expect(
      finagoPostTransaction.handleInvocation({
        input: {
          confirm: true,
          transactionTypeNumber: 1,
          date: '2025-04-09',
          lines: [
            { accountNumber: 1920, amount: 100, taxNumber: 0, currencyCode: 'US' },
            { accountNumber: 3000, amount: -100, taxNumber: 0 }
          ]
        }
      } as any)
    ).rejects.toThrow(
      'lines[0].currencyCode and lines[0].currencyRate must be provided together.'
    );

    expect(mocks.client.post).not.toHaveBeenCalled();
  });

  it('rejects additionalFields that override validated transaction fields', async () => {
    await expect(
      finagoPostTransaction.handleInvocation({
        input: {
          confirm: true,
          transactionTypeNumber: 1,
          date: '2025-04-09',
          lines: [
            { accountNumber: 1920, amount: 100, taxNumber: 0 },
            { accountNumber: 3000, amount: -100, taxNumber: 0 }
          ],
          additionalFields: {
            lines: []
          }
        }
      } as any)
    ).rejects.toThrow(
      'lines cannot be supplied in additionalFields when posting a transaction.'
    );

    expect(mocks.client.post).not.toHaveBeenCalled();
  });

  it('requires the documented transactionId response', async () => {
    mocks.client.post.mockResolvedValue({});

    await expect(
      finagoPostTransaction.handleInvocation({
        input: {
          confirm: true,
          transactionTypeNumber: 1,
          date: '2025-04-09',
          lines: [
            { accountNumber: 1920, amount: 100, taxNumber: 0 },
            { accountNumber: 3000, amount: -100, taxNumber: 0 }
          ]
        }
      } as any)
    ).rejects.toThrow('Finago did not return transactionId for the posted transaction.');
  });
});
