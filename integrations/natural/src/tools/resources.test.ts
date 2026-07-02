import { beforeEach, describe, expect, it, vi } from 'vitest';

const naturalClientMocks = vi.hoisted(() => ({
  request: vi.fn()
}));

const NaturalClientMock = vi.hoisted(() => vi.fn(() => naturalClientMocks));

vi.mock('../lib/client', () => ({
  NaturalClient: NaturalClientMock
}));

import {
  listCounterparties,
  listExternalAccounts,
  listTransactions,
  listWallets
} from './resources';

const createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'sk_ntl_test', keyType: 'party_key' },
    config: {}
  }) as any;

const paginatedEnvelope = (record: Record<string, unknown>) => ({
  data: [record],
  meta: {
    pagination: {
      hasMore: false,
      nextCursor: null
    }
  }
});

describe('Natural resource list tools', () => {
  beforeEach(() => {
    naturalClientMocks.request.mockReset();
    NaturalClientMock.mockClear();
  });

  it('preserves full transaction resources from list transactions', async () => {
    const transaction = {
      id: 'txn_550e8400e29b41d4a716446655440000',
      type: 'transaction',
      attributes: {
        amount: 50000,
        currency: 'USD',
        status: 'PROCESSING',
        transactionType: 'transfer',
        direction: 'INBOUND',
        description: 'Cash in',
        createdAt: '2026-01-04T15:30:00Z',
        updatedAt: '2026-01-04T15:31:00Z',
        expectedAvailableAt: null
      },
      relationships: {
        transfer: {
          data: {
            type: 'transfer',
            id: 'trf_650e8400e29b41d4a716446655440000'
          }
        }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(transaction));

    const result = await listTransactions.handleInvocation(
      createCtx({
        type: 'all',
        limit: 50
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list transactions',
      'get',
      '/transactions',
      {
        params: {
          type: 'all',
          counterpartyPartyId: undefined,
          customerPartyId: undefined,
          delegated: undefined,
          limit: 50,
          cursor: undefined
        }
      }
    );
    expect(result.output.transactions).toEqual([transaction]);
  });

  it('preserves full wallet resources from list wallets', async () => {
    const wallet = {
      id: 'wal_550e8400e29b41d4a716446655440000',
      type: 'wallet',
      attributes: {
        status: 'active',
        walletType: 'standard',
        isDefault: true,
        displayName: 'Operating',
        balance: {
          available: 120000,
          total: 125000,
          currency: 'USD'
        },
        claims: {
          amount: 125000,
          count: 2
        },
        depositInstructions: {
          bankName: 'Bridge Financial'
        }
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: 'pty_7c9e6679e29b41d4a716446655440001'
          }
        }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(wallet));

    const result = await listWallets.handleInvocation(
      createCtx({
        partyId: 'pty_7c9e6679e29b41d4a716446655440001'
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list wallets',
      'get',
      '/wallets',
      {
        params: {
          partyId: 'pty_7c9e6679e29b41d4a716446655440001'
        }
      }
    );
    expect(result.output.wallets).toEqual([wallet]);
  });

  it('preserves full external account resources from list external accounts', async () => {
    const externalAccount = {
      id: 'eac_550e8400e29b41d4a716446655440000',
      type: 'externalAccount',
      attributes: {
        bankName: 'Chase',
        accountName: 'Business Checking',
        accountType: 'checking',
        lastFour: '6789',
        status: 'active',
        createdAt: '2026-01-04T15:30:00Z'
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: 'pty_7c9e6679e29b41d4a716446655440001'
          }
        }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(externalAccount));

    const result = await listExternalAccounts.handleInvocation(
      createCtx({
        cursor: 'cur_123',
        limit: 25
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list external accounts',
      'get',
      '/external-accounts',
      {
        params: {
          cursor: 'cur_123',
          limit: 25
        }
      }
    );
    expect(result.output.externalAccounts).toEqual([externalAccount]);
  });

  it('preserves full counterparty resources from list counterparties', async () => {
    const counterparty = {
      id: 'pty_550e8400e29b41d4a716446655440002',
      type: 'party',
      attributes: {
        name: 'Acme Supplies',
        email: 'payables@acmesupplies.com',
        status: 'ACTIVE'
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(counterparty));

    const result = await listCounterparties.handleInvocation(
      createCtx({
        direction: 'sent',
        limit: 50
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list counterparties',
      'get',
      '/counterparties',
      {
        params: {
          direction: 'sent',
          limit: 50,
          cursor: undefined
        }
      }
    );
    expect(result.output.counterparties).toEqual([counterparty]);
  });
});
