import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { getTransfer } from './money-movement';

const transferId = 'trf_550e8400e29b41d4a716446655440000';
const delegatedPartyId = 'pty_019cd1798d6072ef892361085b12fa01';
const partyId = 'pty_019cd1798d617f65a79cb965dda9eac3';
const walletId = 'wal_550e8400e29b41d4a716446655440000';
const destWalletId = 'wal_650e8400e29b41d4a716446655440000';
const externalAccountId = 'eac_550e8400e29b41d4a716446655440000';
const transactionId = 'txn_550e8400e29b41d4a716446655440000';

const transferResponse = (id = transferId) => ({
  data: {
    type: 'transfer',
    id,
    attributes: {
      type: 'deposit',
      amount: 50000,
      currency: 'USD',
      status: 'PROCESSING',
      description: null,
      externalAccountDisplayMask: null,
      expectedAvailableAt: null,
      failure: null,
      return: null,
      submittedAt: '2026-01-04T15:30:00Z',
      settledAt: null,
      createdAt: '2026-01-04T15:30:00Z',
      updatedAt: '2026-01-04T15:30:00Z'
    },
    relationships: {
      party: { data: { type: 'party', id: partyId } },
      wallet: { data: { type: 'wallet', id: walletId } },
      externalAccount: { data: { type: 'externalAccount', id: externalAccountId } },
      transaction: { data: { type: 'transaction', id: transactionId } }
    }
  }
});

const invokeGetTransfer = (input: { transferId: string; partyId?: string }) =>
  getTransfer.handleInvocation({
    input,
    auth: { token: 'sk_ntl_test', keyType: 'party_key' },
    config: {}
  } as never);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('get_transfer', () => {
  it('accepts nonempty URI-encodable opaque transfer and delegated party IDs', () => {
    const opaqueTransferId = 'trf_Future/format?revision=2#current&scope=all';
    const opaquePartyId = 'pty_Future format/v2';

    expect(getTransfer.inputSchema.safeParse({ transferId }).success).toBe(true);
    expect(
      getTransfer.inputSchema.safeParse({ transferId, partyId: delegatedPartyId }).success
    ).toBe(true);
    expect(
      getTransfer.inputSchema.safeParse({
        transferId: opaqueTransferId,
        partyId: opaquePartyId
      }).success
    ).toBe(true);

    for (const invalidInput of [
      { transferId: 'txn_550e8400e29b41d4a716446655440000' },
      { transferId: 'trf_' },
      { transferId: `trf_${String.fromCharCode(0xd800)}` },
      { transferId, partyId: 'agt_019cd1798d637a4da75dce386343931d' },
      { transferId, partyId: 'pty_' },
      { transferId, partyId: `pty_${String.fromCharCode(0xd800)}` }
    ]) {
      expect(getTransfer.inputSchema.safeParse(invalidInput).success).toBe(false);
    }
  });

  it('URI-encodes the opaque transfer ID in the path and keeps partyId as a query parameter', async () => {
    const opaqueTransferId = 'trf_Future/format?revision=2#current&scope=all';
    const opaquePartyId = 'pty_Future format/v2';
    const request = vi
      .spyOn(NaturalClient.prototype, 'request')
      .mockResolvedValue(transferResponse(opaqueTransferId));

    await invokeGetTransfer({ transferId: opaqueTransferId, partyId: opaquePartyId });

    expect(request).toHaveBeenCalledWith(
      'get transfer',
      'get',
      `/transfers/${encodeURIComponent(opaqueTransferId)}`,
      { params: { partyId: opaquePartyId } }
    );
  });

  it('gets the transfer without a body and exposes lifecycle, relationships, and raw metadata', async () => {
    const transfer = {
      type: 'transfer',
      id: transferId,
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
        updatedAt: '2026-01-06T15:30:00Z',
        futureTransferField: 'preserved'
      },
      relationships: {
        party: { data: { type: 'party', id: partyId } },
        wallet: { data: { type: 'wallet', id: walletId } },
        destWallet: { data: { type: 'wallet', id: destWalletId } },
        externalAccount: { data: { type: 'externalAccount', id: externalAccountId } },
        transaction: { data: { type: 'transaction', id: transactionId } }
      },
      futureResourceField: 'preserved'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: transfer
    });

    const result = await getTransfer.handleInvocation({
      input: { transferId, partyId: delegatedPartyId },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith('get transfer', 'get', `/transfers/${transferId}`, {
      params: { partyId: delegatedPartyId }
    });
    expect(getTransfer.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      transferId,
      transactionId,
      partyId,
      walletId,
      destWalletId,
      externalAccountId,
      type: 'transfer',
      attributes: transfer.attributes,
      relationships: transfer.relationships,
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
      transfer
    });
    expect(result.message).toBe(`Retrieved transfer **${transferId}**.`);
  });

  it('accepts required nullable relationships with an omitted or null destination wallet', async () => {
    const base = transferResponse();
    const withoutDestinationWallet = {
      ...base,
      data: {
        ...base.data,
        relationships: {
          ...base.data.relationships,
          externalAccount: { data: null },
          transaction: { data: null }
        }
      }
    };
    const withNullDestinationWallet = {
      ...base,
      data: {
        ...base.data,
        relationships: {
          ...base.data.relationships,
          destWallet: { data: null }
        }
      }
    };
    vi.spyOn(NaturalClient.prototype, 'request')
      .mockResolvedValueOnce(withoutDestinationWallet)
      .mockResolvedValueOnce(withNullDestinationWallet);

    const omittedResult = await invokeGetTransfer({ transferId });
    const nullResult = await invokeGetTransfer({ transferId });

    expect(omittedResult.output).toMatchObject({
      transferId,
      externalAccountId: undefined,
      transactionId: undefined,
      destWalletId: undefined,
      transfer: withoutDestinationWallet.data
    });
    expect(nullResult.output).toMatchObject({
      transferId,
      destWalletId: undefined,
      transfer: withNullDestinationWallet.data
    });
  });

  it('rejects malformed successful TransferResource responses with safe retry guidance', async () => {
    const base = transferResponse();
    const malformedResponses: [string, unknown][] = [
      ['missing data', {}],
      ['wrong resource type', { data: { ...base.data, type: 'payment' } }],
      [
        'missing required lifecycle field',
        {
          data: {
            ...base.data,
            attributes: { ...base.data.attributes, amount: undefined }
          }
        }
      ],
      [
        'malformed failure details',
        {
          data: {
            ...base.data,
            attributes: { ...base.data.attributes, failure: {} }
          }
        }
      ],
      [
        'null required party relationship',
        {
          data: {
            ...base.data,
            relationships: {
              ...base.data.relationships,
              party: { data: null }
            }
          }
        }
      ],
      [
        'missing required nullable external account relationship',
        {
          data: {
            ...base.data,
            relationships: {
              ...base.data.relationships,
              externalAccount: undefined
            }
          }
        }
      ],
      [
        'wrong transaction relationship type',
        {
          data: {
            ...base.data,
            relationships: {
              ...base.data.relationships,
              transaction: { data: { type: 'payment', id: transactionId } }
            }
          }
        }
      ],
      [
        'malformed optional destination wallet relationship',
        {
          data: {
            ...base.data,
            relationships: {
              ...base.data.relationships,
              destWallet: { data: { type: 'wallet', id: 'pty_wrong_prefix' } }
            }
          }
        }
      ]
    ];
    const request = vi.spyOn(NaturalClient.prototype, 'request');

    for (const [label, response] of malformedResponses) {
      request.mockResolvedValueOnce(response);
      const error = await invokeGetTransfer({ transferId }).catch(cause => cause);

      expect(error, label).toBeInstanceOf(ServiceError);
      if (!(error instanceof ServiceError)) continue;
      expect(error.data.reason, label).toBe('natural_response_error');
      expect(error.message, label).toMatch(/malformed success response/i);
      expect(error.message, label).toMatch(/read-only request.*safe to retry/i);
    }
  });

  it('rejects a mismatched transfer ID with safe retry guidance', async () => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(
      transferResponse('trf_different-opaque-id')
    );

    const error = await invokeGetTransfer({ transferId }).catch(cause => cause);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;
    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different transfer than the one requested/i);
    expect(error.message).toMatch(/read-only request.*safe to retry/i);
  });
});
