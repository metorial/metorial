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
  listAccounts,
  listGeneralLedgerEntries,
  listItems,
  listJournals
} from './catalog-accounting';

let invokeListItems = (input: Record<string, unknown>) =>
  listItems.handleInvocation({
    auth: { businessCentralToken: 'token' },
    config: { businessCentralCompanyId: '11111111-1111-1111-1111-111111111111' },
    input
  } as any);

let invokeListAccounts = (input: Record<string, unknown>) =>
  listAccounts.handleInvocation({
    auth: { businessCentralToken: 'token' },
    config: { businessCentralCompanyId: '11111111-1111-1111-1111-111111111111' },
    input
  } as any);

let invokeListGeneralLedgerEntries = (input: Record<string, unknown>) =>
  listGeneralLedgerEntries.handleInvocation({
    auth: { businessCentralToken: 'token' },
    config: { businessCentralCompanyId: '11111111-1111-1111-1111-111111111111' },
    input
  } as any);

let invokeListJournals = (input: Record<string, unknown>) =>
  listJournals.handleInvocation({
    auth: { businessCentralToken: 'token' },
    config: { businessCentralCompanyId: '11111111-1111-1111-1111-111111111111' },
    input
  } as any);

beforeEach(() => {
  axiosMocks.api.get.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReturnValue(axiosMocks.api);
});

describe('Business Central list items', () => {
  it('uses schema version 2.1 for nested search filters', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: [
          {
            id: '22222222-2222-2222-2222-222222222222',
            number: '1896-S',
            displayName: 'ATHENS Desk',
            type: 'Inventory',
            itemCategoryCode: 'TABLE',
            blocked: false,
            inventory: 4,
            unitPrice: 1000.8,
            unitCost: 780.7,
            priceIncludesTax: false
          }
        ]
      }
    });

    let result = await invokeListItems({
      search: '  Desk  ',
      category: 'TABLE',
      type: 'Inventory',
      limit: 5
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/items',
      {
        params: {
          $top: 5,
          $skip: 0,
          $filter:
            "((contains(tolower(displayName),'desk') or contains(tolower(number),'desk'))) and (itemCategoryCode eq 'TABLE') and (type eq 'Inventory')",
          $schemaversion: '2.1'
        }
      }
    );
    expect(result.output.items[0]).toMatchObject({
      id: '22222222-2222-2222-2222-222222222222',
      number: '1896-S',
      displayName: 'ATHENS Desk',
      type: 'Inventory',
      itemCategoryCode: 'TABLE',
      blocked: false,
      inventory: 4,
      unitPrice: 1000.8,
      unitCost: 780.7,
      priceIncludesTax: false
    });
  });

  it('does not request schema version 2.1 without a search filter', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: []
      }
    });

    await invokeListItems({
      category: 'TABLE',
      limit: 5
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/items',
      {
        params: {
          $top: 5,
          $skip: 0,
          $filter: "itemCategoryCode eq 'TABLE'"
        }
      }
    );
  });
});

describe('Business Central list accounts', () => {
  it('searches account numbers with schema version 2.1 by default', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: [
          {
            id: '33333333-3333-3333-3333-333333333333',
            number: '2910',
            displayName: 'VAT Payable',
            category: 'Liabilities',
            subCategory: 'VAT',
            accountType: 'Posting',
            directPosting: true,
            incomeBalance: 'Balance Sheet',
            debitCreditBalance: 'Credit',
            netChange: -12.34,
            totalBalance: 100.5,
            balance: 100.5,
            consolidationTranslationMethod: 'Average Rate',
            consolidationDebitAccount: '2911',
            consolidationCreditAccount: '2912',
            excludeFromConsolidation: false,
            blocked: false
          }
        ]
      }
    });

    let result = await invokeListAccounts({
      search: ' 2910 ',
      accountCategory: 'Liabilities',
      accountType: 'Posting',
      limit: 10
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/accounts',
      {
        params: {
          $top: 10,
          $skip: 0,
          $filter:
            "((contains(tolower(number),'2910'))) and (category eq 'Liabilities') and (accountType eq 'Posting')",
          $schemaversion: '2.1'
        }
      }
    );
    expect(result.output.accounts[0]).toMatchObject({
      id: '33333333-3333-3333-3333-333333333333',
      number: '2910',
      displayName: 'VAT Payable',
      category: 'Liabilities',
      accountType: 'Posting',
      directPosting: true,
      incomeBalance: 'Balance Sheet',
      debitCreditBalance: 'Credit',
      netChange: -12.34,
      totalBalance: 100.5,
      balance: 100.5,
      consolidationTranslationMethod: 'Average Rate',
      consolidationDebitAccount: '2911',
      consolidationCreditAccount: '2912',
      excludeFromConsolidation: false,
      blocked: false
    });
  });

  it('can target display names without building a cross-field or filter', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: []
      }
    });

    await invokeListAccounts({
      search: 'bank',
      searchField: 'displayName',
      limit: 5
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/accounts',
      {
        params: {
          $top: 5,
          $skip: 0,
          $filter: "(contains(tolower(displayName),'bank'))",
          $schemaversion: '2.1'
        }
      }
    );
  });
});

describe('Business Central list general ledger entries', () => {
  it('uses the documented collection path and maps documented additional currency fields', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: [
          {
            id: '44444444-4444-4444-4444-444444444444',
            entryNumber: 123,
            postingDate: '2026-01-31',
            documentNumber: 'G00001',
            documentType: 'Invoice',
            accountId: '33333333-3333-3333-3333-333333333333',
            accountNumber: '2910',
            description: 'VAT payable',
            debitAmount: 0,
            creditAmount: 25.5,
            additionalCurrencyDebitAmount: 0,
            additionalCurrencyCreditAmount: 2.25,
            lastModifiedDateTime: '2026-02-01T12:34:56Z'
          }
        ]
      }
    });

    let result = await invokeListGeneralLedgerEntries({
      postingDateFrom: '2026-01-01',
      postingDateTo: '2026-01-31',
      accountId: '33333333-3333-3333-3333-333333333333',
      accountNumber: '2910',
      documentNumber: 'G00001',
      limit: 10
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/generalLedgerEntries',
      {
        params: {
          $top: 10,
          $skip: 0,
          $filter:
            "(postingDate ge 2026-01-01) and (postingDate le 2026-01-31) and (accountId eq 33333333-3333-3333-3333-333333333333) and (accountNumber eq '2910') and (documentNumber eq 'G00001')"
        }
      }
    );
    expect(result.output.generalLedgerEntries[0]).toMatchObject({
      id: '44444444-4444-4444-4444-444444444444',
      entryNumber: 123,
      postingDate: '2026-01-31',
      documentNumber: 'G00001',
      documentType: 'Invoice',
      accountId: '33333333-3333-3333-3333-333333333333',
      accountNumber: '2910',
      description: 'VAT payable',
      debitAmount: 0,
      creditAmount: 25.5,
      additionalCurrencyDebitAmount: 0,
      additionalCurrencyCreditAmount: 2.25,
      lastModifiedDateTime: '2026-02-01T12:34:56Z'
    });
  });
});

describe('Business Central list journals', () => {
  it('searches one journal field with schema version 2.1', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: [
          {
            id: '55555555-5555-5555-5555-555555555555',
            code: 'DEFAULT',
            displayName: 'Default Journal',
            templateDisplayName: 'GENERAL',
            balancingAccountId: '33333333-3333-3333-3333-333333333333',
            balancingAccountNumber: '2910',
            lastModifiedDateTime: '2026-02-01T12:34:56Z'
          }
        ]
      }
    });

    let result = await invokeListJournals({
      search: ' default ',
      templateDisplayName: 'GENERAL',
      limit: 10
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/journals',
      {
        params: {
          $top: 10,
          $skip: 0,
          $filter:
            "((contains(tolower(code),'default'))) and (templateDisplayName eq 'GENERAL')",
          $schemaversion: '2.1'
        }
      }
    );
    expect(result.output.journals[0]).toMatchObject({
      id: '55555555-5555-5555-5555-555555555555',
      code: 'DEFAULT',
      displayName: 'Default Journal',
      templateDisplayName: 'GENERAL',
      balancingAccountId: '33333333-3333-3333-3333-333333333333',
      balancingAccountNumber: '2910',
      lastModifiedDateTime: '2026-02-01T12:34:56Z'
    });
  });

  it('can search journal display names without cross-field or filters', async () => {
    axiosMocks.api.get.mockResolvedValueOnce({
      data: {
        value: []
      }
    });

    await invokeListJournals({
      search: 'cash',
      searchField: 'displayName',
      limit: 5
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/companies(11111111-1111-1111-1111-111111111111)/journals',
      {
        params: {
          $top: 5,
          $skip: 0,
          $filter: "(contains(tolower(displayName),'cash'))",
          $schemaversion: '2.1'
        }
      }
    );
  });
});
