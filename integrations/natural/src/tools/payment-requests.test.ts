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
  declinePaymentRequest,
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

const completeDeclinedPaymentRequest = {
  ...paymentRequest,
  attributes: {
    ...paymentRequest.attributes,
    status: 'DECLINED',
    requesterAvatarUrl: 'https://natural.test/requester.png',
    walletName: 'Primary wallet',
    payerAvatarUrl: 'https://natural.test/payer.png',
    payerPartyId: 'pty_550e8400e29b41d4a716446655440000',
    payerIdentifierType: 'party_id',
    payerIdentifier: 'pty_550e8400e29b41d4a716446655440000',
    updatedAt: '2026-04-16T00:00:00.000Z',
    futureAttribute: 'preserved'
  },
  relationships: {
    ...paymentRequest.relationships,
    payerParty: {
      data: {
        type: 'party',
        id: 'pty_550e8400e29b41d4a716446655440000'
      }
    },
    payerAgent: {
      data: {
        type: 'agent',
        id: 'agt_550e8400e29b41d4a716446655440000'
      }
    },
    payment: {
      data: {
        type: 'payment',
        id: 'pay_550e8400e29b41d4a716446655440000'
      }
    },
    futureRelationship: { data: null }
  },
  futureResourceField: 'preserved'
};

const fulfilledPayment = {
  id: 'pay_550e8400e29b41d4a716446655440000',
  type: 'payment',
  attributes: {
    amount: 500,
    currency: 'USD',
    status: 'COMPLETED',
    description: null,
    createdAt: '2026-04-15T00:00:00.000Z',
    updatedAt: null
  },
  relationships: {
    sender: {
      data: {
        type: 'party',
        id: 'pty_019cd1798d617f65a79cb965dda9eac3'
      }
    },
    senderAgent: { data: null },
    recipient: {
      data: {
        type: 'party',
        id: 'pty_019cd1798d627ad9bc302511c4f2c115'
      }
    },
    recipientAgent: { data: null },
    transaction: {
      data: {
        type: 'transaction',
        id: 'txn_550e8400e29b41d4a716446655440000'
      }
    },
    paymentRequest: {
      data: {
        type: 'paymentRequest',
        id: 'prq_550e8400e29b41d4a716446655440000'
      }
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
        includeCompleted: false,
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
          includeCompleted: false,
          limit: 25,
          cursor: 'cur_123'
        }
      }
    );
    expect(result.output.paymentRequests).toEqual([paymentRequest]);
  });

  it('sends documented incoming filters and exposes stable fields plus raw metadata', async () => {
    const incomingPaymentRequest = {
      ...paymentRequest,
      attributes: {
        ...paymentRequest.attributes,
        requesterAvatarUrl: 'https://natural.test/requester.png',
        walletName: 'Primary wallet',
        payerAvatarUrl: 'https://natural.test/payer.png',
        payerPartyId: 'pty_019cd1798d627ad9bc302511c4f2c115',
        payerIdentifierType: 'agent_id',
        payerIdentifier: 'agt_550e8400e29b41d4a716446655440000',
        transactionId: 'txn_550e8400e29b41d4a716446655440000'
      },
      relationships: {
        ...paymentRequest.relationships,
        payerParty: {
          data: {
            type: 'party',
            id: 'pty_019cd1798d627ad9bc302511c4f2c115'
          }
        },
        payerAgent: {
          data: {
            type: 'agent',
            id: 'agt_550e8400e29b41d4a716446655440000'
          }
        },
        payment: {
          data: {
            type: 'payment',
            id: 'pay_550e8400e29b41d4a716446655440000'
          }
        }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce(
      paginatedEnvelope(incomingPaymentRequest)
    );

    const partyId = 'pty_019cd1798d627ad9bc302511c4f2c115';

    expect(listIncomingPaymentRequests.inputSchema.safeParse({ partyId }).success).toBe(true);
    expect(
      listIncomingPaymentRequests.inputSchema.safeParse({ partyId: 'not-a-party-id' }).success
    ).toBe(false);

    const result = await listIncomingPaymentRequests.handleInvocation(
      createCtx({
        partyId,
        limit: 10,
        cursor: 'cur_current'
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list incoming payment requests',
      'get',
      '/payment-requests/incoming',
      {
        params: {
          partyId,
          limit: 10,
          cursor: 'cur_current'
        }
      }
    );
    const parsedOutput = listIncomingPaymentRequests.outputSchema.parse(result.output);
    expect(parsedOutput).toEqual({
      paymentRequests: [
        expect.objectContaining({
          id: 'prq_550e8400e29b41d4a716446655440000',
          paymentRequestId: 'prq_550e8400e29b41d4a716446655440000',
          type: 'paymentRequest',
          amount: 500,
          currency: 'USD',
          status: 'OPEN',
          description: 'Invoice 7',
          requesterName: 'Natural Coffee',
          requesterEmail: 'billing@natural.test',
          requesterAvatarUrl: 'https://natural.test/requester.png',
          walletName: 'Primary wallet',
          payerName: 'Ada Lovelace',
          payerEmail: 'ada@example.com',
          payerAvatarUrl: 'https://natural.test/payer.png',
          payerPhone: null,
          payerPartyId: 'pty_019cd1798d627ad9bc302511c4f2c115',
          payerIdentifierType: 'agent_id',
          payerIdentifier: 'agt_550e8400e29b41d4a716446655440000',
          paymentLinkUrl: 'https://app.natural.test/pay/token_123',
          transactionId: 'txn_550e8400e29b41d4a716446655440000',
          createdAt: '2026-04-15T00:00:00.000Z',
          updatedAt: '2026-04-15T00:00:00.000Z',
          requesterPartyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
          walletId: 'wal_550e8400e29b41d4a716446655440000',
          payerAgentId: 'agt_550e8400e29b41d4a716446655440000',
          paymentId: 'pay_550e8400e29b41d4a716446655440000',
          attributes: incomingPaymentRequest.attributes,
          relationships: incomingPaymentRequest.relationships,
          paymentRequest: incomingPaymentRequest
        })
      ],
      pagination: {
        hasMore: false,
        nextCursor: null
      }
    });
  });

  it('validates fulfillment IDs, confirmation, idempotency, and exclusive payment sources', async () => {
    const input = {
      paymentRequestId: 'prq_550e8400e29b41d4a716446655440000',
      paymentSourceType: 'wallet' as const,
      walletId: 'wal_550e8400e29b41d4a716446655440000',
      partyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
      idempotencyKey: 'fulfill-payment-request-1',
      confirm: true
    };

    expect(fulfillPaymentRequest.inputSchema.safeParse(input).success).toBe(true);
    expect(
      fulfillPaymentRequest.inputSchema.safeParse({
        ...input,
        paymentRequestId: 'payment-request-1'
      }).success
    ).toBe(false);
    expect(
      fulfillPaymentRequest.inputSchema.safeParse({ ...input, partyId: 'party-1' }).success
    ).toBe(false);
    expect(
      fulfillPaymentRequest.inputSchema.safeParse({ ...input, walletId: 'wallet-1' }).success
    ).toBe(false);
    expect(
      fulfillPaymentRequest.inputSchema.safeParse({
        ...input,
        paymentSourceType: 'external_account',
        walletId: undefined,
        externalAccountId: 'eac_550e8400e29b41d4a716446655440000'
      }).success
    ).toBe(true);
    expect(
      fulfillPaymentRequest.inputSchema.safeParse({
        ...input,
        paymentSourceType: 'external_account',
        walletId: undefined,
        externalAccountId: 'external-account-1'
      }).success
    ).toBe(false);
    expect(fulfillPaymentRequest.tags).toMatchObject({ destructive: true });
    expect(fulfillPaymentRequest.description).toContain('open Natural payment request');
    expect(fulfillPaymentRequest.description).toContain('reuse the same idempotency key');

    await expect(
      fulfillPaymentRequest.handleInvocation(createCtx({ ...input, confirm: false }))
    ).rejects.toThrow(/confirm/i);
    await expect(
      fulfillPaymentRequest.handleInvocation(
        createCtx({ ...input, idempotencyKey: undefined })
      )
    ).rejects.toThrow(/idempotencyKey/i);
    await expect(
      fulfillPaymentRequest.handleInvocation(createCtx({ ...input, walletId: undefined }))
    ).rejects.toThrow(/walletId/i);
    await expect(
      fulfillPaymentRequest.handleInvocation(
        createCtx({
          ...input,
          externalAccountId: 'eac_550e8400e29b41d4a716446655440000'
        })
      )
    ).rejects.toThrow(/externalAccountId/i);
    await expect(
      fulfillPaymentRequest.handleInvocation(
        createCtx({
          ...input,
          paymentSourceType: 'external_account',
          walletId: 'wal_550e8400e29b41d4a716446655440000',
          externalAccountId: 'eac_550e8400e29b41d4a716446655440000'
        })
      )
    ).rejects.toThrow(/walletId/i);
    expect(naturalClientMocks.request).not.toHaveBeenCalled();
  });

  it('fulfills from a wallet with the documented delegated body and exposes payment metadata', async () => {
    const paymentRequestId = 'prq_550e8400e29b41d4a716446655440000';
    const paymentId = 'pay_550e8400e29b41d4a716446655440000';
    const transactionId = 'txn_550e8400e29b41d4a716446655440000';
    const senderPartyId = 'pty_019cd1798d617f65a79cb965dda9eac3';
    const recipientPartyId = 'pty_019cd1798d627ad9bc302511c4f2c115';
    const payment = {
      ...fulfilledPayment,
      attributes: {
        ...fulfilledPayment.attributes,
        providerState: 'settled'
      },
      relationships: {
        ...fulfilledPayment.relationships,
        sender: {
          ...fulfilledPayment.relationships.sender,
          links: { related: 'https://api.natural.co/parties/sender' }
        }
      },
      providerTraceId: 'trace_123'
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: payment });

    const result = await fulfillPaymentRequest.handleInvocation(
      createCtx({
        paymentRequestId,
        paymentSourceType: 'wallet',
        walletId: 'wal_550e8400e29b41d4a716446655440000',
        partyId: senderPartyId,
        idempotencyKey: 'idem_123',
        confirm: true
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'fulfill payment request',
      'post',
      `/payment-requests/${paymentRequestId}/fulfill`,
      {
        requiresAgentInstance: true,
        idempotencyKey: 'idem_123',
        body: {
          partyId: senderPartyId,
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
    expect(fulfillPaymentRequest.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      paymentId,
      type: 'payment',
      status: 'COMPLETED',
      payment,
      transactionId,
      paymentRequestId,
      senderPartyId,
      senderAgentId: null,
      recipientPartyId,
      recipientAgentId: null,
      amount: 500,
      currency: 'USD',
      description: null,
      createdAt: '2026-04-15T00:00:00.000Z',
      updatedAt: null
    });
    expect(result.message).toBe(
      `Fulfilled payment request **${paymentRequestId}** as payment **${paymentId}**.`
    );
  });

  it('fulfills from an external account and preserves null relationship data as nullable IDs', async () => {
    const paymentRequestId = 'prq_550e8400e29b41d4a716446655440000';
    const payment = {
      ...fulfilledPayment,
      attributes: {
        ...fulfilledPayment.attributes,
        status: 'PROCESSING'
      },
      relationships: {
        sender: { data: null },
        senderAgent: { data: null },
        recipient: { data: null },
        recipientAgent: { data: null },
        transaction: { data: null },
        paymentRequest: { data: null }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: payment });

    const result = await fulfillPaymentRequest.handleInvocation(
      createCtx({
        paymentRequestId,
        paymentSourceType: 'external_account',
        externalAccountId: 'eac_550e8400e29b41d4a716446655440000',
        idempotencyKey: 'idem_external_123',
        confirm: true
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'fulfill payment request',
      'post',
      `/payment-requests/${paymentRequestId}/fulfill`,
      {
        requiresAgentInstance: true,
        idempotencyKey: 'idem_external_123',
        body: {
          data: {
            attributes: {
              paymentSource: {
                type: 'external_account',
                externalAccountId: 'eac_550e8400e29b41d4a716446655440000'
              }
            }
          }
        }
      }
    );
    expect(result.output).toMatchObject({
      paymentId: payment.id,
      paymentRequestId,
      senderPartyId: null,
      senderAgentId: null,
      recipientPartyId: null,
      recipientAgentId: null,
      transactionId: null,
      payment
    });
    expect(result.message).toContain(`payment request **${paymentRequestId}**`);
  });

  it.each([
    ['missing data', {}],
    [
      'wrong resource type',
      {
        data: {
          ...fulfilledPayment,
          type: 'paymentRequest'
        }
      }
    ],
    [
      'invalid payment id',
      {
        data: {
          ...fulfilledPayment,
          id: 'payment-1'
        }
      }
    ],
    [
      'missing core attribute',
      {
        data: {
          ...fulfilledPayment,
          attributes: {
            currency: 'USD',
            status: 'COMPLETED',
            description: null,
            createdAt: '2026-04-15T00:00:00.000Z',
            updatedAt: null
          }
        }
      }
    ],
    [
      'missing relationship container',
      {
        data: {
          ...fulfilledPayment,
          relationships: {
            sender: fulfilledPayment.relationships.sender,
            senderAgent: fulfilledPayment.relationships.senderAgent,
            recipient: fulfilledPayment.relationships.recipient,
            recipientAgent: fulfilledPayment.relationships.recipientAgent,
            paymentRequest: fulfilledPayment.relationships.paymentRequest
          }
        }
      }
    ],
    [
      'malformed nullable relationship',
      {
        data: {
          ...fulfilledPayment,
          relationships: {
            ...fulfilledPayment.relationships,
            transaction: { data: { type: 'transaction' } }
          }
        }
      }
    ]
  ])('rejects a malformed fulfillment success response with %s', async (_case, response) => {
    naturalClientMocks.request.mockResolvedValueOnce(response);

    const error = await fulfillPaymentRequest
      .handleInvocation(
        createCtx({
          paymentRequestId: 'prq_550e8400e29b41d4a716446655440000',
          paymentSourceType: 'wallet',
          walletId: 'wal_550e8400e29b41d4a716446655440000',
          idempotencyKey: 'idem_malformed_123',
          confirm: true
        })
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/malformed success response/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });

  it('validates and confirms destructive payment request declines before calling Natural', async () => {
    const paymentRequestId = 'prq_550e8400e29b41d4a716446655440000';

    for (const opaquePaymentRequestId of [
      paymentRequestId,
      'prq_550E8400E29B41D4A716446655440000',
      'prq_future-format.v2',
      'prq_future/format?revision=2#current',
      'prq_未来🚀'
    ]) {
      expect(
        declinePaymentRequest.inputSchema.safeParse({
          paymentRequestId: opaquePaymentRequestId,
          idempotencyKey: 'decline-payment-request-1',
          confirm: true
        }).success
      ).toBe(true);
    }
    for (const invalidPaymentRequestId of [
      '',
      'prq_',
      'payment-request-1',
      'PRQ_550e8400e29b41d4a716446655440000',
      'prq_future\uD800',
      'prq_future\uDC00'
    ]) {
      expect(
        declinePaymentRequest.inputSchema.safeParse({
          paymentRequestId: invalidPaymentRequestId,
          idempotencyKey: 'decline-payment-request-1',
          confirm: true
        }).success
      ).toBe(false);
    }
    expect(declinePaymentRequest.tags).toMatchObject({ destructive: true });
    expect(declinePaymentRequest.description).toContain('open Natural payment request');
    expect(declinePaymentRequest.description).toContain('reuse the same idempotency key');

    await expect(
      declinePaymentRequest.handleInvocation(
        createCtx({
          paymentRequestId,
          idempotencyKey: 'decline-payment-request-1',
          confirm: false
        })
      )
    ).rejects.toThrow(/confirm/i);
    await expect(
      declinePaymentRequest.handleInvocation(
        createCtx({ paymentRequestId, idempotencyKey: undefined, confirm: true })
      )
    ).rejects.toThrow(/idempotencyKey/i);
    expect(naturalClientMocks.request).not.toHaveBeenCalled();
  });

  it('posts a bodyless decline with idempotency, encodes its opaque ID, and preserves additive fields', async () => {
    const paymentRequestId = 'prq_future/format?revision=2#現在🚀';
    const declinedPaymentRequest = {
      ...completeDeclinedPaymentRequest,
      id: paymentRequestId
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: declinedPaymentRequest });

    const result = await declinePaymentRequest.handleInvocation(
      createCtx({
        paymentRequestId: declinedPaymentRequest.id,
        idempotencyKey: 'decline-payment-request-1',
        confirm: true
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'decline payment request',
      'post',
      `/payment-requests/${encodeURIComponent(paymentRequestId)}/decline`,
      { idempotencyKey: 'decline-payment-request-1' }
    );
    expect(declinePaymentRequest.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      paymentRequestId: declinedPaymentRequest.id,
      type: 'paymentRequest',
      status: 'DECLINED',
      amount: 500,
      currency: 'USD',
      paymentLinkUrl: 'https://app.natural.test/pay/token_123',
      paymentRequest: declinedPaymentRequest,
      description: 'Invoice 7',
      requesterName: 'Natural Coffee',
      requesterEmail: 'billing@natural.test',
      requesterAvatarUrl: 'https://natural.test/requester.png',
      requesterPartyId: 'pty_019cd1798d617f65a79cb965dda9eac3',
      walletName: 'Primary wallet',
      walletId: 'wal_550e8400e29b41d4a716446655440000',
      payerName: 'Ada Lovelace',
      payerEmail: 'ada@example.com',
      payerAvatarUrl: 'https://natural.test/payer.png',
      payerPhone: null,
      payerPartyId: 'pty_550e8400e29b41d4a716446655440000',
      payerIdentifierType: 'party_id',
      payerIdentifier: 'pty_550e8400e29b41d4a716446655440000',
      payerAgentId: 'agt_550e8400e29b41d4a716446655440000',
      transactionId: null,
      paymentId: 'pay_550e8400e29b41d4a716446655440000',
      createdAt: '2026-04-15T00:00:00.000Z',
      updatedAt: '2026-04-16T00:00:00.000Z'
    });
    expect(result.message).toBe(`Declined payment request **${declinedPaymentRequest.id}**.`);
  });

  it('preserves null payer agent and payment relationship IDs', async () => {
    const paymentRequestId = 'prq_opaque-null-relationships';
    const declinedPaymentRequest = {
      ...completeDeclinedPaymentRequest,
      id: paymentRequestId,
      attributes: {
        ...completeDeclinedPaymentRequest.attributes,
        payerPartyId: null
      },
      relationships: {
        ...completeDeclinedPaymentRequest.relationships,
        payerParty: { data: null },
        payerAgent: { data: null },
        payment: { data: null }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: declinedPaymentRequest });

    const result = await declinePaymentRequest.handleInvocation(
      createCtx({
        paymentRequestId,
        idempotencyKey: 'decline-payment-request-null-relationships',
        confirm: true
      })
    );

    expect(result.output).toMatchObject({
      paymentRequestId,
      payerPartyId: null,
      payerAgentId: null,
      paymentId: null,
      paymentRequest: declinedPaymentRequest
    });
    expect(declinePaymentRequest.outputSchema.parse(result.output)).toEqual(result.output);
  });

  it('rejects a successful response for a different payment request ID', async () => {
    naturalClientMocks.request.mockResolvedValueOnce({
      data: {
        ...completeDeclinedPaymentRequest,
        id: 'prq_different-opaque-id'
      }
    });

    const error = await declinePaymentRequest
      .handleInvocation(
        createCtx({
          paymentRequestId: completeDeclinedPaymentRequest.id,
          idempotencyKey: 'decline-payment-request-mismatched-id',
          confirm: true
        })
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different payment request/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });

  it.each([
    ['missing data', {}],
    [
      'wrong resource type',
      {
        data: {
          ...completeDeclinedPaymentRequest,
          type: 'payment_request'
        }
      }
    ],
    [
      'empty payment request ID',
      {
        data: {
          ...completeDeclinedPaymentRequest,
          id: 'prq_'
        }
      }
    ],
    [
      'missing core attribute',
      {
        data: {
          ...completeDeclinedPaymentRequest,
          attributes: {
            ...completeDeclinedPaymentRequest.attributes,
            amount: undefined
          }
        }
      }
    ],
    [
      'missing required relationship container',
      {
        data: {
          ...completeDeclinedPaymentRequest,
          relationships: {
            requesterParty: completeDeclinedPaymentRequest.relationships.requesterParty,
            wallet: completeDeclinedPaymentRequest.relationships.wallet,
            payerParty: completeDeclinedPaymentRequest.relationships.payerParty,
            payment: completeDeclinedPaymentRequest.relationships.payment
          }
        }
      }
    ],
    [
      'malformed nullable relationship',
      {
        data: {
          ...completeDeclinedPaymentRequest,
          relationships: {
            ...completeDeclinedPaymentRequest.relationships,
            payerAgent: { data: { type: 'agent' } }
          }
        }
      }
    ]
  ])('rejects a malformed decline success response with %s', async (_case, response) => {
    naturalClientMocks.request.mockResolvedValueOnce(response);

    const error = await declinePaymentRequest
      .handleInvocation(
        createCtx({
          paymentRequestId: completeDeclinedPaymentRequest.id,
          idempotencyKey: 'decline-payment-request-malformed-response',
          confirm: true
        })
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/malformed success response/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });
});
