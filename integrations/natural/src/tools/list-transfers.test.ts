import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { listTransfers } from './money-movement';

const partyId = 'pty_019cd1798d617f65a79cb965dda9eac3';
const walletId = 'wal_550e8400e29b41d4a716446655440000';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('list_transfers', () => {
  it('validates the documented party ID and pagination constraints', () => {
    expect(listTransfers.inputSchema.safeParse({ partyId }).success).toBe(true);
    expect(listTransfers.inputSchema.safeParse({ partyId: 'not-a-party-id' }).success).toBe(
      false
    );
    expect(listTransfers.inputSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(listTransfers.inputSchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(listTransfers.inputSchema.parse({}).limit).toBe(50);
  });

  it('sends documented query parameters and retains transfer lifecycle metadata', async () => {
    const returnedTransfer = {
      type: 'transfer',
      id: 'trf_550e8400e29b41d4a716446655440000',
      attributes: {
        type: 'withdrawal',
        amount: 50000,
        currency: 'USD',
        status: 'RETURNED',
        description: 'Vendor refund withdrawal',
        externalAccountDisplayMask: '6789',
        expectedAvailableAt: null,
        failure: null,
        return: {
          code: 'R01',
          reason: 'Insufficient funds',
          returnedAt: '2026-01-06T15:30:00Z'
        },
        submittedAt: '2026-01-04T15:30:00Z',
        settledAt: '2026-01-05T15:30:00Z',
        createdAt: '2026-01-04T15:29:00Z',
        updatedAt: '2026-01-06T15:30:00Z'
      },
      relationships: {
        party: { data: { type: 'party', id: partyId } },
        wallet: { data: { type: 'wallet', id: walletId } },
        destWallet: { data: null },
        externalAccount: {
          data: {
            type: 'externalAccount',
            id: 'eac_550e8400e29b41d4a716446655440000'
          }
        },
        transaction: {
          data: {
            type: 'transaction',
            id: 'txn_550e8400e29b41d4a716446655440000'
          }
        }
      }
    };
    const failedInternalTransfer = {
      type: 'transfer',
      id: 'trf_650e8400e29b41d4a716446655440000',
      attributes: {
        type: 'internal',
        amount: 2500,
        currency: 'USD',
        status: 'FAILED',
        description: null,
        externalAccountDisplayMask: null,
        expectedAvailableAt: '2026-01-07T15:30:00Z',
        failure: { code: 'transfer_failed', reason: 'Destination unavailable' },
        return: null,
        submittedAt: null,
        settledAt: null,
        createdAt: '2026-01-07T15:29:00Z',
        updatedAt: null
      },
      relationships: {
        party: { data: { type: 'party', id: partyId } },
        wallet: { data: { type: 'wallet', id: walletId } },
        destWallet: {
          data: {
            type: 'wallet',
            id: 'wal_650e8400e29b41d4a716446655440000'
          }
        },
        externalAccount: { data: null },
        transaction: { data: null }
      }
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: [returnedTransfer, failedInternalTransfer],
      meta: {
        pagination: {
          hasMore: true,
          nextCursor: 'cur_next'
        }
      }
    });

    const result = await listTransfers.handleInvocation({
      input: { partyId, limit: 10, cursor: 'cur_current' },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith('list transfers', 'get', '/transfers', {
      params: {
        partyId,
        limit: 10,
        cursor: 'cur_current'
      }
    });
    const parsedOutput = listTransfers.outputSchema.parse(result.output);
    expect(parsedOutput.transfers).toHaveLength(2);
    expect(result.output).toEqual({
      transfers: [
        expect.objectContaining({
          id: returnedTransfer.id,
          transferId: returnedTransfer.id,
          type: 'transfer',
          transferType: 'withdrawal',
          direction: 'withdrawal',
          status: 'RETURNED',
          amount: 50000,
          currency: 'USD',
          description: 'Vendor refund withdrawal',
          externalAccountDisplayMask: '6789',
          expectedAvailableAt: null,
          failure: null,
          return: {
            code: 'R01',
            reason: 'Insufficient funds',
            returnedAt: '2026-01-06T15:30:00Z'
          },
          submittedAt: '2026-01-04T15:30:00Z',
          settledAt: '2026-01-05T15:30:00Z',
          createdAt: '2026-01-04T15:29:00Z',
          updatedAt: '2026-01-06T15:30:00Z',
          partyId,
          walletId,
          destWalletId: undefined,
          externalAccountId: 'eac_550e8400e29b41d4a716446655440000',
          transactionId: 'txn_550e8400e29b41d4a716446655440000',
          attributes: returnedTransfer.attributes,
          relationships: returnedTransfer.relationships,
          transfer: returnedTransfer
        }),
        expect.objectContaining({
          id: failedInternalTransfer.id,
          transferId: failedInternalTransfer.id,
          transferType: 'internal',
          direction: 'internal',
          status: 'FAILED',
          failure: { code: 'transfer_failed', reason: 'Destination unavailable' },
          return: null,
          partyId,
          walletId,
          destWalletId: 'wal_650e8400e29b41d4a716446655440000',
          externalAccountId: undefined,
          transactionId: undefined,
          transfer: failedInternalTransfer
        })
      ],
      pagination: {
        hasMore: true,
        nextCursor: 'cur_next'
      }
    });
    expect(result.message).toBe('Found **2** transfers.');
  });
});
