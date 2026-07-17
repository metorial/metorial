import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const naturalClientMocks = vi.hoisted(() => ({
  request: vi.fn()
}));

const NaturalClientMock = vi.hoisted(() => vi.fn(() => naturalClientMocks));

vi.mock('../lib/client', () => ({
  NaturalClient: NaturalClientMock
}));

import {
  getTransaction,
  getWallet,
  listCounterparties,
  listExternalAccounts,
  listTransactions,
  listWallets,
  removeExternalAccount
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

describe('Natural get transaction tool', () => {
  beforeEach(() => {
    naturalClientMocks.request.mockReset();
    NaturalClientMock.mockClear();
  });

  it('validates documented transaction and delegated-party ID formats', () => {
    expect(
      getTransaction.inputSchema.safeParse({
        transactionId: 'txn_550e8400e29b41d4a716446655440000',
        partyId: 'pty_7c9e6679e29b41d4a716446655440001'
      }).success
    ).toBe(true);
    expect(
      getTransaction.inputSchema.safeParse({ transactionId: 'transaction-123' }).success
    ).toBe(false);
    expect(
      getTransaction.inputSchema.safeParse({
        transactionId: 'txn_550e8400e29b41d4a716446655440000',
        partyId: 'party-123'
      }).success
    ).toBe(false);
  });

  it('sends the documented bodyless GET and exposes stable fields plus raw metadata', async () => {
    const transactionId = 'txn_550e8400e29b41d4a716446655440000';
    const partyId = 'pty_7c9e6679e29b41d4a716446655440001';
    const destinationPartyId = 'pty_7c9e6679e29b41d4a716446655440002';
    const paymentId = 'pay_550e8400e29b41d4a716446655440000';
    const walletId = 'wal_550e8400e29b41d4a716446655440000';
    const transaction = {
      type: 'transaction',
      id: transactionId,
      attributes: {
        amount: 100000,
        currency: 'USD',
        status: 'COMPLETED',
        description: 'Invoice payment',
        createdAt: '2026-01-04T15:30:00Z',
        updatedAt: '2026-01-04T15:31:00Z',
        transactionType: 'payment',
        direction: 'OUTBOUND',
        expectedAvailableAt: null
      },
      relationships: {
        sourceParty: { data: { type: 'party', id: partyId } },
        destinationParty: { data: { type: 'party', id: destinationPartyId } },
        payment: { data: { type: 'payment', id: paymentId } },
        wallet: { data: { type: 'wallet', id: walletId } }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: transaction });

    const result = await getTransaction.handleInvocation(
      createCtx({ transactionId, partyId })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'get transaction',
      'get',
      `/transactions/${transactionId}`,
      { params: { partyId } }
    );
    expect(getTransaction.outputSchema.parse(result.output)).toEqual({
      transactionId,
      type: 'transaction',
      status: 'COMPLETED',
      amount: 100000,
      currency: 'USD',
      transactionType: 'payment',
      direction: 'OUTBOUND',
      description: 'Invoice payment',
      createdAt: '2026-01-04T15:30:00Z',
      updatedAt: '2026-01-04T15:31:00Z',
      expectedAvailableAt: null,
      sourcePartyId: partyId,
      destinationPartyId,
      paymentId,
      transferId: undefined,
      walletId,
      transaction
    });
  });
});

describe('Natural get wallet tool', () => {
  beforeEach(() => {
    naturalClientMocks.request.mockReset();
    NaturalClientMock.mockClear();
  });

  it('validates the documented wallet ID format', () => {
    expect(
      getWallet.inputSchema.safeParse({
        walletId: 'wal_550e8400e29b41d4a716446655440000'
      }).success
    ).toBe(true);
    expect(getWallet.inputSchema.safeParse({ walletId: 'wallet-123' }).success).toBe(false);
  });

  it('sends the documented bodyless GET and exposes stable fields plus raw metadata', async () => {
    const walletId = 'wal_550e8400e29b41d4a716446655440000';
    const partyId = 'pty_7c9e6679e29b41d4a716446655440001';
    const wallet = {
      type: 'wallet',
      id: walletId,
      attributes: {
        status: 'active',
        walletType: 'standard',
        isDefault: true,
        createdAt: '2026-01-04T15:30:00Z',
        displayName: 'Operating',
        description: null,
        balance: {
          available: 120000,
          total: 125000,
          currency: 'USD'
        },
        claims: {
          amount: 5000,
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
            id: partyId
          }
        }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: wallet });

    const result = await getWallet.handleInvocation(createCtx({ walletId }));

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'get wallet',
      'get',
      `/wallets/${walletId}`
    );
    expect(getWallet.outputSchema.parse(result.output)).toEqual({
      walletId,
      type: 'wallet',
      status: 'active',
      walletType: 'standard',
      isDefault: true,
      displayName: 'Operating',
      description: null,
      availableBalance: 120000,
      totalBalance: 125000,
      currency: 'USD',
      claimsAmount: 5000,
      claimsCount: 2,
      depositBankName: 'Bridge Financial',
      createdAt: '2026-01-04T15:30:00Z',
      partyId,
      wallet
    });
  });
});

describe('Natural remove external account tool', () => {
  beforeEach(() => {
    naturalClientMocks.request.mockReset();
    NaturalClientMock.mockClear();
  });

  it('accepts URI-encodable opaque eac_ IDs and is marked destructive', () => {
    for (const externalAccountId of [
      'eac_550e8400e29b41d4a716446655440000',
      'eac_550E8400E29B41D4A716446655440000',
      'eac_future-format.v2',
      'eac_future/format?revision=2#current',
      'eac_未来🚀'
    ]) {
      expect(
        removeExternalAccount.inputSchema.safeParse({ externalAccountId, confirm: true })
          .success
      ).toBe(true);
    }

    for (const externalAccountId of [
      '',
      'eac_',
      'wal_550e8400e29b41d4a716446655440000',
      'EAC_550e8400e29b41d4a716446655440000',
      'eac_future\uD800',
      'eac_future\uDC00'
    ]) {
      expect(
        removeExternalAccount.inputSchema.safeParse({ externalAccountId, confirm: true })
          .success
      ).toBe(false);
    }
    expect(
      removeExternalAccount.inputSchema.safeParse({
        externalAccountId: 'eac_550e8400e29b41d4a716446655440000'
      }).success
    ).toBe(false);
    expect(removeExternalAccount.tags).toMatchObject({ destructive: true });
    expect(removeExternalAccount.description).toContain('Remove (unlink)');
    expect(removeExternalAccount.description).toContain('confirmation');
    expect(removeExternalAccount.description).toContain('not documented as idempotent');
  });

  it('requires explicit confirmation before making the destructive request', async () => {
    await expect(
      removeExternalAccount.handleInvocation(
        createCtx({
          externalAccountId: 'eac_550e8400e29b41d4a716446655440000',
          confirm: false
        })
      )
    ).rejects.toThrow(/confirm/i);

    expect(naturalClientMocks.request).not.toHaveBeenCalled();
  });

  it('sends a bodyless DELETE without idempotency, encodes the opaque ID, and preserves raw additive fields', async () => {
    const externalAccountId = 'eac_future/format?revision=2#現在🚀';
    const externalAccount = {
      type: 'externalAccount',
      id: externalAccountId,
      attributes: {
        bankName: null,
        accountName: null,
        accountType: null,
        lastFour: '',
        status: 'disabled',
        connectionStatus: 'active',
        createdAt: '0001-01-01T00:00:00.000Z',
        futureAttribute: 'preserved'
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: 'pty_7c9e6679e29b41d4a716446655440001',
            futureIdentifierField: 'preserved'
          },
          futurePartyRelationshipField: 'preserved'
        },
        futureRelationship: { data: null }
      },
      futureResourceField: 'preserved'
    };
    const meta = {
      deleted: true,
      requestId: 'req_550e8400e29b41d4a716446655440000',
      futureMetaField: 'preserved'
    };
    naturalClientMocks.request.mockResolvedValueOnce({
      data: externalAccount,
      meta,
      futureEnvelopeField: 'accepted'
    });

    const result = await removeExternalAccount.handleInvocation(
      createCtx({ externalAccountId, confirm: true })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'remove external account',
      'delete',
      `/external-accounts/${encodeURIComponent(externalAccountId)}`
    );
    expect(removeExternalAccount.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      externalAccountId,
      type: 'externalAccount',
      status: 'disabled',
      externalAccount,
      deleted: true,
      meta
    });
    expect(result.message).toBe(`Removed external account **${externalAccountId}**.`);
  });

  it.each([
    ['missing response', undefined],
    ['missing data', { meta: { deleted: true } }],
    [
      'wrong resource type',
      {
        data: {
          type: 'external_account',
          id: 'eac_opaque',
          attributes: {
            bankName: null,
            accountName: null,
            accountType: null,
            lastFour: '',
            status: 'disabled',
            connectionStatus: 'active',
            createdAt: '2026-01-04T15:30:00Z'
          },
          relationships: {
            party: { data: { type: 'party', id: 'pty_opaque' } }
          }
        },
        meta: { deleted: true }
      }
    ],
    [
      'incomplete attributes',
      {
        data: {
          type: 'externalAccount',
          id: 'eac_opaque',
          attributes: {
            bankName: null,
            accountName: null,
            accountType: null,
            lastFour: '',
            status: 'disabled',
            createdAt: '2026-01-04T15:30:00Z'
          },
          relationships: {
            party: { data: { type: 'party', id: 'pty_opaque' } }
          }
        },
        meta: { deleted: true }
      }
    ],
    [
      'missing relationships',
      {
        data: {
          type: 'externalAccount',
          id: 'eac_opaque',
          attributes: {
            bankName: null,
            accountName: null,
            accountType: null,
            lastFour: '',
            status: 'disabled',
            connectionStatus: 'active',
            createdAt: '2026-01-04T15:30:00Z'
          }
        },
        meta: { deleted: true }
      }
    ],
    [
      'missing deletion metadata',
      {
        data: {
          type: 'externalAccount',
          id: 'eac_opaque',
          attributes: {
            bankName: null,
            accountName: null,
            accountType: null,
            lastFour: '',
            status: 'disabled',
            connectionStatus: 'active',
            createdAt: '2026-01-04T15:30:00Z'
          },
          relationships: {
            party: { data: { type: 'party', id: 'pty_opaque' } }
          }
        }
      }
    ],
    [
      'false deletion confirmation',
      {
        data: {
          type: 'externalAccount',
          id: 'eac_opaque',
          attributes: {
            bankName: null,
            accountName: null,
            accountType: null,
            lastFour: '',
            status: 'disabled',
            connectionStatus: 'active',
            createdAt: '2026-01-04T15:30:00Z'
          },
          relationships: {
            party: { data: { type: 'party', id: 'pty_opaque' } }
          }
        },
        meta: { deleted: false }
      }
    ],
    [
      'string deletion confirmation',
      {
        data: {
          type: 'externalAccount',
          id: 'eac_opaque',
          attributes: {
            bankName: null,
            accountName: null,
            accountType: null,
            lastFour: '',
            status: 'disabled',
            connectionStatus: 'active',
            createdAt: '2026-01-04T15:30:00Z'
          },
          relationships: {
            party: { data: { type: 'party', id: 'pty_opaque' } }
          }
        },
        meta: { deleted: 'true' }
      }
    ]
  ])('rejects a malformed success response with %s', async (_case, response) => {
    naturalClientMocks.request.mockResolvedValueOnce(response);

    const error = await removeExternalAccount
      .handleInvocation(
        createCtx({
          externalAccountId: 'eac_opaque',
          confirm: true
        })
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/malformed success response/i);
    expect(error.message).toMatch(/verify external account state.*before retrying/i);
    expect(error.message).toMatch(/non-idempotent request/i);
  });

  it('rejects a response for a different external account with verify-state guidance', async () => {
    naturalClientMocks.request.mockResolvedValueOnce({
      data: {
        type: 'externalAccount',
        id: 'eac_different',
        attributes: {
          bankName: null,
          accountName: null,
          accountType: null,
          lastFour: '',
          status: 'disabled',
          connectionStatus: 'active',
          createdAt: '2026-01-04T15:30:00Z'
        },
        relationships: {
          party: { data: { type: 'party', id: 'pty_opaque' } }
        }
      },
      meta: { deleted: true }
    });

    const error = await removeExternalAccount
      .handleInvocation(createCtx({ externalAccountId: 'eac_requested', confirm: true }))
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different external account/i);
    expect(error.message).toMatch(/verify external account state.*before retrying/i);
    expect(error.message).toMatch(/non-idempotent request/i);
  });
});

describe('Natural resource list tools', () => {
  beforeEach(() => {
    naturalClientMocks.request.mockReset();
    NaturalClientMock.mockClear();
  });

  it('validates list transaction resource filters', () => {
    expect(
      listTransactions.inputSchema.safeParse({
        counterpartyPartyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
        walletId: 'wal_550e8400e29b41d4a716446655440000',
        customerPartyId: 'pty_019cd1798d627ad9bc302511c4f2c115'
      }).success
    ).toBe(true);
    expect(
      listTransactions.inputSchema.safeParse({ counterpartyPartyId: 'not-a-party-id' }).success
    ).toBe(false);
    expect(
      listTransactions.inputSchema.safeParse({ walletId: 'not-a-wallet-id' }).success
    ).toBe(false);
    expect(
      listTransactions.inputSchema.safeParse({ customerPartyId: 'not-a-party-id' }).success
    ).toBe(false);
  });

  it('sends documented filters and exposes stable transaction fields plus raw metadata', async () => {
    const counterpartyPartyId = 'pty_019cd1798d617f65a79cb965dda9eac3';
    const customerPartyId = 'pty_019cd1798d627ad9bc302511c4f2c115';
    const walletId = 'wal_550e8400e29b41d4a716446655440000';
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
        sourceParty: {
          data: {
            type: 'party',
            id: customerPartyId
          }
        },
        destinationParty: {
          data: {
            type: 'party',
            id: counterpartyPartyId
          }
        },
        transfer: {
          data: {
            type: 'transfer',
            id: 'trf_650e8400e29b41d4a716446655440000'
          }
        },
        wallet: {
          data: {
            type: 'wallet',
            id: walletId
          }
        }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(transaction));

    const result = await listTransactions.handleInvocation(
      createCtx({
        type: 'all',
        counterpartyPartyId,
        walletId,
        customerPartyId,
        delegated: true,
        limit: 50,
        cursor: 'cur_current'
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list transactions',
      'get',
      '/transactions',
      {
        params: {
          type: 'all',
          counterpartyPartyId,
          walletId,
          customerPartyId,
          delegated: true,
          limit: 50,
          cursor: 'cur_current'
        }
      }
    );
    const parsedOutput = listTransactions.outputSchema.parse(result.output);
    expect(parsedOutput.transactions[0]).toEqual(
      expect.objectContaining({
        id: 'txn_550e8400e29b41d4a716446655440000',
        transactionId: 'txn_550e8400e29b41d4a716446655440000',
        type: 'transaction',
        status: 'PROCESSING',
        amount: 50000,
        currency: 'USD',
        transactionType: 'transfer',
        direction: 'INBOUND',
        description: 'Cash in',
        createdAt: '2026-01-04T15:30:00Z',
        updatedAt: '2026-01-04T15:31:00Z',
        expectedAvailableAt: null,
        sourcePartyId: customerPartyId,
        destinationPartyId: counterpartyPartyId,
        transferId: 'trf_650e8400e29b41d4a716446655440000',
        walletId,
        transaction
      })
    );
  });

  it('validates delegated party IDs and exposes stable wallet fields plus raw metadata', async () => {
    const partyId = 'pty_7c9e6679e29b41d4a716446655440001';
    expect(listWallets.inputSchema.safeParse({ partyId }).success).toBe(true);
    expect(listWallets.inputSchema.safeParse({ partyId: 'party-123' }).success).toBe(false);

    const wallet = {
      id: 'wal_550e8400e29b41d4a716446655440000',
      type: 'wallet',
      attributes: {
        status: 'active',
        walletType: 'standard',
        isDefault: true,
        createdAt: '2026-01-04T15:30:00Z',
        displayName: 'Operating',
        description: null,
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
            id: partyId
          }
        }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(wallet));

    const result = await listWallets.handleInvocation(
      createCtx({
        partyId
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list wallets',
      'get',
      '/wallets',
      {
        params: {
          partyId
        }
      }
    );
    const parsedOutput = listWallets.outputSchema.parse(result.output);
    expect(parsedOutput.wallets[0]).toEqual(
      expect.objectContaining({
        id: 'wal_550e8400e29b41d4a716446655440000',
        walletId: 'wal_550e8400e29b41d4a716446655440000',
        type: 'wallet',
        attributes: wallet.attributes,
        relationships: wallet.relationships,
        status: 'active',
        walletType: 'standard',
        isDefault: true,
        displayName: 'Operating',
        description: null,
        availableBalance: 120000,
        totalBalance: 125000,
        currency: 'USD',
        claimsAmount: 125000,
        claimsCount: 2,
        depositBankName: 'Bridge Financial',
        createdAt: '2026-01-04T15:30:00Z',
        partyId,
        wallet
      })
    );
    expect(parsedOutput.pagination).toEqual({ hasMore: false, nextCursor: null });
  });

  it('sends documented pagination and exposes stable external account fields plus raw metadata', async () => {
    const externalAccountId = 'eac_550e8400e29b41d4a716446655440000';
    const partyId = 'pty_7c9e6679e29b41d4a716446655440001';
    const externalAccount = {
      id: externalAccountId,
      type: 'externalAccount',
      attributes: {
        bankName: 'Chase',
        accountName: 'Business Checking',
        accountType: 'checking',
        lastFour: '6789',
        status: 'active',
        connectionStatus: 'active',
        createdAt: '2026-01-04T15:30:00Z'
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: partyId
          }
        }
      }
    };
    expect(listExternalAccounts.inputSchema.parse({})).toEqual({ limit: 50 });
    expect(listExternalAccounts.inputSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(listExternalAccounts.inputSchema.safeParse({ limit: 101 }).success).toBe(false);
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
    expect(listExternalAccounts.outputSchema.parse(result.output)).toEqual({
      externalAccounts: [
        {
          id: externalAccountId,
          externalAccountId,
          type: 'externalAccount',
          attributes: externalAccount.attributes,
          relationships: externalAccount.relationships,
          status: 'active',
          connectionStatus: 'active',
          bankName: 'Chase',
          accountName: 'Business Checking',
          accountType: 'checking',
          lastFour: '6789',
          createdAt: '2026-01-04T15:30:00Z',
          partyId,
          externalAccount
        }
      ],
      pagination: {
        hasMore: false,
        nextCursor: null
      }
    });
  });

  it('routes to the documented legacy direction and exposes aggregate fields plus raw metadata', async () => {
    const counterpartyId = 'pty_550e8400e29b41d4a716446655440002';
    const counterparty = {
      id: counterpartyId,
      type: 'party',
      attributes: {
        counterpartyPartyId: counterpartyId,
        totalAmountMinor: 500000,
        transactionCount: 5,
        firstAt: '2026-01-04T15:30:00.000Z',
        partyName: 'Acme Supplies',
        partyEmail: 'payables@acmesupplies.com',
        partyStatus: 'ACTIVE',
        futureAttribute: 'preserved'
      },
      relationships: {
        latestPayment: {
          data: {
            type: 'payment',
            id: 'pay_550e8400e29b41d4a716446655440003'
          }
        }
      },
      futureResourceField: 'preserved'
    };
    const meta = {
      pagination: {
        hasMore: false,
        nextCursor: null,
        futurePaginationField: 'preserved'
      },
      requestId: 'req_counterparties',
      futureMetaField: 'preserved'
    };
    expect(listCounterparties.inputSchema.safeParse({}).success).toBe(false);
    expect(listCounterparties.inputSchema.parse({ direction: 'sent' })).toEqual({
      direction: 'sent',
      limit: 50
    });
    expect(listCounterparties.inputSchema.safeParse({ direction: 'outbound' }).success).toBe(
      false
    );
    expect(
      listCounterparties.inputSchema.safeParse({ direction: 'sent', limit: 0 }).success
    ).toBe(false);
    expect(
      listCounterparties.inputSchema.safeParse({ direction: 'received', limit: 101 }).success
    ).toBe(false);
    expect(listCounterparties.tags).toMatchObject({ readOnly: true, deprecated: true });
    naturalClientMocks.request.mockResolvedValueOnce({ data: [counterparty], meta });

    const result = await listCounterparties.handleInvocation(
      createCtx({
        direction: 'sent',
        limit: 50,
        cursor: 'cur_current'
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list counterparties',
      'get',
      '/counterparties/sent',
      {
        params: {
          limit: 50,
          cursor: 'cur_current'
        }
      }
    );
    expect(listCounterparties.outputSchema.parse(result.output)).toEqual({
      counterparties: [
        {
          id: counterpartyId,
          counterpartyId,
          partyId: counterpartyId,
          type: 'party',
          attributes: counterparty.attributes,
          relationships: counterparty.relationships,
          name: 'Acme Supplies',
          email: 'payables@acmesupplies.com',
          status: 'ACTIVE',
          totalAmountMinor: 500000,
          transactionCount: 5,
          firstAt: '2026-01-04T15:30:00.000Z',
          counterparty
        }
      ],
      pagination: {
        hasMore: false,
        nextCursor: null
      },
      meta
    });
  });
});
