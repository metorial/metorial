import { beforeEach, describe, expect, it, vi } from 'vitest';

const naturalClientMocks = vi.hoisted(() => ({
  request: vi.fn()
}));

const NaturalClientMock = vi.hoisted(() => vi.fn(() => naturalClientMocks));

vi.mock('../lib/client', () => ({
  NaturalClient: NaturalClientMock
}));

import {
  fulfillPaymentRequest,
  listIncomingPaymentRequests,
  listPaymentRequests
} from './payment-requests';

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

const paymentRequest = {
  id: 'prq_550e8400e29b41d4a716446655440000',
  type: 'paymentRequest',
  attributes: {
    amount: 500,
    currency: 'USD',
    status: 'OPEN',
    description: 'Invoice 7',
    requesterName: 'Natural Coffee',
    requesterEmail: 'billing@natural.test',
    payerName: 'Ada Lovelace',
    payerEmail: 'ada@example.com',
    payerPhone: null,
    payerPartyId: null,
    payerIdentifierType: 'email',
    payerIdentifier: 'ada@example.com',
    paymentLinkUrl: 'https://app.natural.test/pay/token_123',
    transactionId: null,
    createdAt: '2026-04-15T00:00:00.000Z',
    updatedAt: '2026-04-15T00:00:00.000Z'
  },
  relationships: {
    requesterParty: {
      data: {
        type: 'party',
        id: 'pty_019cd1798d617f65a79cb965dda9eac3'
      }
    },
    wallet: {
      data: {
        type: 'wallet',
        id: 'wal_550e8400e29b41d4a716446655440000'
      }
    },
    payerParty: {
      data: null
    },
    payment: {
      data: null
    }
  }
};

describe('Natural payment request tools', () => {
  beforeEach(() => {
    naturalClientMocks.request.mockReset();
    NaturalClientMock.mockClear();
  });

  it('preserves full payment request resources from list payment requests', async () => {
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(paymentRequest));

    const result = await listPaymentRequests.handleInvocation(
      createCtx({
        partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
        limit: 25,
        cursor: 'cur_123'
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list payment requests',
      'get',
      '/payment-requests',
      {
        params: {
          partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
          limit: 25,
          cursor: 'cur_123'
        }
      }
    );
    expect(result.output.paymentRequests).toEqual([paymentRequest]);
  });

  it('preserves full payment request resources from list incoming payment requests', async () => {
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(paymentRequest));

    const result = await listIncomingPaymentRequests.handleInvocation(
      createCtx({
        limit: 10
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list incoming payment requests',
      'get',
      '/payment-requests/incoming',
      {
        params: {
          partyId: undefined,
          limit: 10,
          cursor: undefined
        }
      }
    );
    expect(result.output.paymentRequests).toEqual([paymentRequest]);
  });

  it('fulfills payment requests with the documented payment source and delegated party body', async () => {
    const payment = {
      id: 'pay_550e8400e29b41d4a716446655440000',
      type: 'payment',
      attributes: {
        status: 'PROCESSING'
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: payment });

    const result = await fulfillPaymentRequest.handleInvocation(
      createCtx({
        paymentRequestId: 'prq_550e8400e29b41d4a716446655440000',
        paymentSourceType: 'wallet',
        walletId: 'wal_550e8400e29b41d4a716446655440000',
        partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
        idempotencyKey: 'idem_123',
        confirm: true
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'fulfill payment request',
      'post',
      '/payment-requests/prq_550e8400e29b41d4a716446655440000/fulfill',
      {
        idempotencyKey: 'idem_123',
        body: {
          partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
          data: {
            attributes: {
              paymentSource: {
                type: 'wallet',
                walletId: 'wal_550e8400e29b41d4a716446655440000'
              }
            }
          }
        }
      }
    );
    expect(result.output.paymentId).toBe('pay_550e8400e29b41d4a716446655440000');
  });
});
