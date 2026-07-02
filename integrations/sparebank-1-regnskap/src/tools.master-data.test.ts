import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMock = vi.hoisted(() => ({
  list: vi.fn()
}));

vi.mock('./lib/client', () => ({
  SpareBankRegnskapClient: vi.fn(() => clientMock)
}));

import { listAccounts } from './tools/master-data';

let invokeListAccounts = (input: Record<string, unknown>) =>
  listAccounts.handleInvocation({
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
  clientMock.list.mockReset();
});

describe('SpareBank 1 Regnskap list_accounts', () => {
  it('queries the documented accounts endpoint and maps documented Account fields', async () => {
    clientMock.list.mockResolvedValueOnce([
      {
        ID: 12,
        AccountID: 34,
        AccountNumber: 3000,
        AccountName: 'Sales revenue',
        Description: 'Domestic sales',
        AccountGroupID: 3,
        TopLevelAccountGroupID: 1,
        VatTypeID: 25,
        StatusCode: 100,
        Active: true,
        Visible: true,
        Locked: false,
        LockManualPosts: true,
        Deleted: false,
        SystemAccount: false,
        UpdatedAt: '2026-01-02T03:04:05Z'
      }
    ]);

    let result = await invokeListAccounts({
      companyKey: 'company-from-input',
      accountNumber: 3000,
      search: 'Sales',
      active: true,
      visible: true,
      deleted: false,
      top: 10,
      skip: 5
    });

    expect(clientMock.list).toHaveBeenCalledWith(
      '/accounts',
      {
        filter:
          "AccountNumber eq 3000 and contains(AccountName,'Sales') and Active eq true and Visible eq true and Deleted eq false",
        top: 10,
        skip: 5
      },
      'company-from-input'
    );
    expect(result.output.accounts[0]).toMatchObject({
      id: 12,
      accountId: 34,
      accountNumber: 3000,
      accountName: 'Sales revenue',
      name: 'Sales revenue',
      description: 'Domestic sales',
      accountGroupId: 3,
      topLevelAccountGroupId: 1,
      vatTypeId: 25,
      statusCode: 100,
      active: true,
      visible: true,
      locked: false,
      lockManualPosts: true,
      deleted: false,
      systemAccount: false,
      updatedAt: '2026-01-02T03:04:05Z'
    });
  });
});
