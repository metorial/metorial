import { ServiceError } from '@lowerdeck/error';
import { expectMcpCompatibleToolSchema } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { provider } from '../index';
import { NaturalClient } from '../lib/client';
import { cancelPaymentRequest } from './payment-requests';

const paymentRequestId = 'prq_future/format?revision=2#現在🚀';
const requesterPartyId = 'pty_019cd1798d617f65a79cb965dda9eac3';
const walletId = 'wal_550e8400e29b41d4a716446655440000';
const payerPartyId = 'pty_019cd1798d627ad9bc302511c4f2c115';
const payerAgentId = 'agt_019cd1798d637a4da75dce386343931d';

const validInput = {
  paymentRequestId,
  idempotencyKey: 'cancel-payment-request-1',
  confirm: true
};

const canceledPaymentRequest = {
  type: 'paymentRequest',
  id: paymentRequestId,
  attributes: {
    amount: 2500,
    currency: 'USD',
    status: 'CANCELED',
    description: 'Invoice 7',
    requesterName: 'Natural Coffee',
    requesterEmail: 'billing@natural.test',
    requesterAvatarUrl: 'https://natural.test/requester.png',
    walletName: 'Main wallet',
    payerName: 'Ada Lovelace',
    payerEmail: 'ada@example.com',
    payerAvatarUrl: 'https://natural.test/payer.png',
    payerPhone: null,
    payerPartyId,
    payerIdentifierType: 'party_id',
    payerIdentifier: payerPartyId,
    paymentLinkUrl: 'https://natural.com/paymentLink/token_123',
    transactionId: null,
    createdAt: '2026-04-15T00:00:00.000Z',
    updatedAt: '2026-04-16T00:00:00.000Z',
    futureAttribute: 'preserved'
  },
  relationships: {
    requesterParty: {
      data: { type: 'party', id: requesterPartyId },
      futureRelationshipField: 'preserved'
    },
    wallet: { data: { type: 'wallet', id: walletId } },
    payerParty: { data: { type: 'party', id: payerPartyId } },
    payerAgent: { data: { type: 'agent', id: payerAgentId } },
    payment: { data: null },
    futureRelationship: { data: null }
  },
  futureResourceField: 'preserved'
};

const context = {
  auth: { token: 'sk_ntl_test', keyType: 'party_key' },
  config: {}
};

afterEach(() => {
  vi.restoreAllMocks();
});

const invoke = (input: Record<string, unknown> = validInput) =>
  cancelPaymentRequest.handleInvocation({ ...context, input } as never);

const expectResponseError = async (response: unknown) => {
  vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

  const error = await invoke().catch((caught: unknown) => caught);

  expect(error).toBeInstanceOf(ServiceError);
  if (!(error instanceof ServiceError)) return;

  expect(error.data.reason).toBe('natural_response_error');
  expect(error.message).toMatch(/verify.+current status/i);
  expect(error.message).toMatch(/same idempotency key/i);
};

describe('cancel_payment_request', () => {
  it('exports a registered MCP-compatible destructive tool under the length limit', () => {
    expectMcpCompatibleToolSchema(cancelPaymentRequest);
    expect(`natural-${cancelPaymentRequest.key}`.length).toBeLessThan(60);
    expect(cancelPaymentRequest.tags).toMatchObject({ destructive: true });
    expect(provider.actions.some(action => action.key === 'cancel_payment_request')).toBe(
      true
    );
  });

  it('accepts opaque URI-encodable prq IDs and enforces the documented idempotency limit', () => {
    for (const id of [
      'prq_550e8400e29b41d4a716446655440000',
      'prq_550E8400E29B41D4A716446655440000',
      'prq_future-format.v2',
      paymentRequestId,
      'prq_未来🚀'
    ]) {
      expect(
        cancelPaymentRequest.inputSchema.safeParse({ ...validInput, paymentRequestId: id })
          .success
      ).toBe(true);
    }

    for (const id of [
      '',
      'prq_',
      'payment-request-1',
      'PRQ_future-format',
      'prq_future\uD800',
      'prq_future\uDC00'
    ]) {
      expect(
        cancelPaymentRequest.inputSchema.safeParse({ ...validInput, paymentRequestId: id })
          .success
      ).toBe(false);
    }

    expect(
      cancelPaymentRequest.inputSchema.safeParse({
        ...validInput,
        idempotencyKey: 'x'.repeat(255)
      }).success
    ).toBe(true);
    expect(
      cancelPaymentRequest.inputSchema.safeParse({
        ...validInput,
        idempotencyKey: 'x'.repeat(256)
      }).success
    ).toBe(false);
  });

  it('requires explicit confirmation and an idempotency key before calling Natural', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');

    await expect(invoke({ ...validInput, confirm: false })).rejects.toThrow(/confirm/i);
    await expect(invoke({ ...validInput, idempotencyKey: undefined })).rejects.toThrow(
      /idempotencyKey/i
    );
    expect(request).not.toHaveBeenCalled();
  });

  it('posts bodylessly to the encoded path and preserves the complete resource and metadata', async () => {
    const meta = {
      supportId: 'req_cancel_123',
      replayed: false,
      futureMeta: { preserved: true }
    };
    const request = vi
      .spyOn(NaturalClient.prototype, 'request')
      .mockResolvedValue({ data: canceledPaymentRequest, meta });

    const result = await invoke();

    expect(request).toHaveBeenCalledWith(
      'cancel payment request',
      'post',
      `/payment-requests/${encodeURIComponent(paymentRequestId)}/cancel`,
      { idempotencyKey: validInput.idempotencyKey }
    );
    expect(cancelPaymentRequest.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      paymentRequestId,
      type: 'paymentRequest',
      status: 'CANCELED',
      amount: 2500,
      currency: 'USD',
      paymentLinkUrl: 'https://natural.com/paymentLink/token_123',
      paymentRequest: canceledPaymentRequest,
      description: 'Invoice 7',
      requesterName: 'Natural Coffee',
      requesterEmail: 'billing@natural.test',
      requesterAvatarUrl: 'https://natural.test/requester.png',
      requesterPartyId,
      walletName: 'Main wallet',
      walletId,
      payerName: 'Ada Lovelace',
      payerEmail: 'ada@example.com',
      payerAvatarUrl: 'https://natural.test/payer.png',
      payerPhone: null,
      payerPartyId,
      payerIdentifierType: 'party_id',
      payerIdentifier: payerPartyId,
      payerAgentId,
      transactionId: null,
      paymentId: null,
      createdAt: '2026-04-15T00:00:00.000Z',
      updatedAt: '2026-04-16T00:00:00.000Z',
      meta
    });
    expect(result.message).toBe(`Canceled payment request **${paymentRequestId}**.`);
  });

  it.each([
    ['missing data', {}],
    ['wrong resource type', { data: { ...canceledPaymentRequest, type: 'payment_request' } }],
    [
      'missing required attribute',
      {
        data: {
          ...canceledPaymentRequest,
          attributes: { ...canceledPaymentRequest.attributes, createdAt: undefined }
        }
      }
    ],
    [
      'missing required relationship',
      {
        data: {
          ...canceledPaymentRequest,
          relationships: { ...canceledPaymentRequest.relationships, payment: undefined }
        }
      }
    ],
    [
      'non-canceled status',
      {
        data: {
          ...canceledPaymentRequest,
          attributes: { ...canceledPaymentRequest.attributes, status: 'OPEN' }
        }
      }
    ]
  ])('rejects a 2xx %s response with safe recovery guidance', async (_case, response) => {
    await expectResponseError(response);
  });

  it('rejects a 2xx response for a different payment request ID', async () => {
    await expectResponseError({
      data: { ...canceledPaymentRequest, id: 'prq_different-opaque-id' }
    });
  });
});
