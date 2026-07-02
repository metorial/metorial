import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMock = vi.hoisted(() => ({
  get: vi.fn(),
  report: vi.fn()
}));

vi.mock('./lib/client', () => ({
  SpareBankRegnskapClient: vi.fn(() => clientMock)
}));

import { getBalanceSheet, getProfitAndLoss, getSupplierInvoice } from './tools/accounting';

let invokeGetSupplierInvoice = (input: Record<string, unknown>) =>
  getSupplierInvoice.handleInvocation({
    auth: {
      token: 'token',
      environment: 'sb1',
      environmentName: 'SpareBank 1 Regnskap',
      baseUrl: 'https://regnskap.sb1.no/',
      appFrameworkUrl: 'https://regnskap.sb1.no/',
      identityUrl: 'https://login.regnskap.sparebank1.no/',
      filesUrl: 'https://files.regnskap.sb1.no/'
    },
    config: { companyKey: 'company-from-config' },
    input
  } as any);

let invokeGetProfitAndLoss = (input: Record<string, unknown>) =>
  getProfitAndLoss.handleInvocation({
    auth: {
      token: 'token',
      environment: 'sb1',
      environmentName: 'SpareBank 1 Regnskap',
      baseUrl: 'https://regnskap.sb1.no/',
      appFrameworkUrl: 'https://regnskap.sb1.no/',
      identityUrl: 'https://login.regnskap.sparebank1.no/',
      filesUrl: 'https://files.regnskap.sb1.no/'
    },
    config: { companyKey: 'company-from-config' },
    input
  } as any);

let invokeGetBalanceSheet = (input: Record<string, unknown>) =>
  getBalanceSheet.handleInvocation({
    auth: {
      token: 'token',
      environment: 'sb1',
      environmentName: 'SpareBank 1 Regnskap',
      baseUrl: 'https://regnskap.sb1.no/',
      appFrameworkUrl: 'https://regnskap.sb1.no/',
      identityUrl: 'https://login.regnskap.sparebank1.no/',
      filesUrl: 'https://files.regnskap.sb1.no/'
    },
    config: { companyKey: 'company-from-config' },
    input
  } as any);

beforeEach(() => {
  clientMock.get.mockReset();
  clientMock.report.mockReset();
});

describe('SpareBank 1 Regnskap get_supplier_invoice', () => {
  it('queries the documented supplier invoice endpoint and maps documented AP state fields', async () => {
    clientMock.get.mockResolvedValueOnce({
      ID: 123,
      InvoiceNumber: 'SI-1001',
      SupplierID: 45,
      SupplierOrgNumber: '999888777',
      CostSupplier: {
        Info: {
          Name: 'Vendor AS'
        }
      },
      InvoiceDate: '2026-01-02',
      FinancialDate: '2026-01-03',
      PaymentDueDate: '2026-02-02',
      StatusCode: 30103,
      PaymentStatus: 2,
      PrintStatus: 1,
      TaxInclusiveAmount: 1250,
      TaxExclusiveAmount: 1000,
      RestAmount: 250,
      IsSentToPayment: true,
      PreventPayment: true,
      Credited: true,
      CreditedAmount: 100,
      CreditedAmountCurrency: 100,
      PayableRoundingAmount: 0.5,
      PayableRoundingCurrencyAmount: 0.5,
      InvoiceOriginType: 1,
      JournalEntryID: 987,
      Deleted: false
    });

    let result = await invokeGetSupplierInvoice({
      supplierInvoiceId: 123,
      select: 'InvoiceNumber,PreventPayment',
      expand: 'CostSupplier'
    });

    expect(clientMock.get).toHaveBeenCalledWith(
      '/supplierinvoices/123',
      {
        select: 'InvoiceNumber,PreventPayment',
        expand: 'CostSupplier'
      },
      'company-from-config'
    );
    expect(result.output.supplierInvoice).toMatchObject({
      id: 123,
      invoiceNumber: 'SI-1001',
      supplierId: 45,
      supplierName: 'Vendor AS',
      supplierOrgNumber: '999888777',
      invoiceDate: '2026-01-02',
      financialDate: '2026-01-03',
      paymentDueDate: '2026-02-02',
      statusCode: 30103,
      paymentStatus: 2,
      printStatus: 1,
      taxInclusiveAmount: 1250,
      taxExclusiveAmount: 1000,
      restAmount: 250,
      isSentToPayment: true,
      preventPayment: true,
      credited: true,
      creditedAmount: 100,
      creditedAmountCurrency: 100,
      payableRoundingAmount: 0.5,
      payableRoundingCurrencyAmount: 0.5,
      invoiceOriginType: 1,
      journalEntryId: 987,
      deleted: false
    });
  });
});

describe('SpareBank 1 Regnskap get_profit_and_loss', () => {
  it('queries the documented profit-and-loss action with documented query parameters', async () => {
    clientMock.report.mockResolvedValueOnce({
      Periods: [],
      Totals: {}
    });

    let result = await invokeGetProfitAndLoss({
      companyKey: 'company-from-input',
      financialYear: 2026,
      sumAllYears: 'true'
    });

    expect(clientMock.report).toHaveBeenCalledWith(
      '/accounts?action=profit-and-loss-periodical',
      {
        FinancialYear: 2026,
        SumAllYears: 'true'
      },
      'company-from-input'
    );
    expect(result.output.report).toEqual({
      Periods: [],
      Totals: {}
    });
  });
});

describe('SpareBank 1 Regnskap get_balance_sheet', () => {
  it('queries the documented balance action with only the documented query parameter', async () => {
    clientMock.report.mockResolvedValueOnce({
      Rows: []
    });

    let result = await invokeGetBalanceSheet({
      financialYear: 2026,
      select: 'ID',
      expand: 'AccountGroup'
    });

    expect(clientMock.report).toHaveBeenCalledWith(
      '/accounts?action=balance',
      {
        FinancialYear: 2026
      },
      'company-from-config'
    );
    expect(result.output.report).toEqual({
      Rows: []
    });
  });
});
