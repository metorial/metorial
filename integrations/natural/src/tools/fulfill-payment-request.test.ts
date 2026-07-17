import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fulfillPaymentRequest } from './payment-requests';

const { axiosRequest } = vi.hoisted(() => ({
  axiosRequest: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  const actual = await importOriginal<typeof import('slates')>();

  return {
    ...actual,
    createAuthenticatedAxios: vi.fn(() => ({ request: axiosRequest }))
  };
});

const paymentRequestId = 'prq_550e8400e29b41d4a716446655440000';
const walletId = 'wal_550e8400e29b41d4a716446655440000';
const paymentId = 'pay_550e8400e29b41d4a716446655440000';

const validInput = {
  paymentRequestId,
  paymentSourceType: 'wallet' as const,
  walletId,
  idempotencyKey: 'fulfill-payment-request-1',
  confirm: true
};

const fulfilledPayment = {
  type: 'payment',
  id: paymentId,
  attributes: {
    amount: 500,
    currency: 'USD',
    status: 'COMPLETED',
    description: null,
    createdAt: '2026-04-15T00:00:00.000Z',
    updatedAt: null
  },
  relationships: {
    sender: { data: null },
    senderAgent: { data: null },
    recipient: { data: null },
    recipientAgent: { data: null },
    transaction: { data: null },
    paymentRequest: {
      data: {
        type: 'paymentRequest',
        id: paymentRequestId
      }
    }
  }
};

afterEach(() => {
  vi.restoreAllMocks();
  axiosRequest.mockReset();
});

describe('fulfill_payment_request instance attribution', () => {
  it('rejects an agent-key fulfillment without an instance ID before HTTP dispatch', async () => {
    const error = await fulfillPaymentRequest
      .handleInvocation({
        input: validInput,
        auth: { token: 'ak_ntl_test', keyType: 'agent_key' },
        config: {}
      } as never)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_validation_error');
    expect(error.message).toMatch(/X-Instance-ID.+agent-attributed money movement/i);
    expect(axiosRequest).not.toHaveBeenCalled();
  });

  it.each([
    {
      keyType: 'agent_key' as const,
      config: { instanceId: 'fulfillment-run-123' },
      expectedHeaders: {
        'Idempotency-Key': 'fulfill-payment-request-1',
        'X-Instance-ID': 'fulfillment-run-123'
      }
    },
    {
      keyType: 'party_key' as const,
      config: {},
      expectedHeaders: {
        'Idempotency-Key': 'fulfill-payment-request-1'
      }
    }
  ])('preserves fulfillment for $keyType authentication', async ({
    keyType,
    config,
    expectedHeaders
  }) => {
    axiosRequest.mockResolvedValue({ data: { data: fulfilledPayment } });

    const result = await fulfillPaymentRequest.handleInvocation({
      input: validInput,
      auth: { token: `${keyType}_test`, keyType },
      config
    } as never);

    expect(axiosRequest).toHaveBeenCalledWith({
      method: 'post',
      url: `/payment-requests/${paymentRequestId}/fulfill`,
      params: undefined,
      data: {
        data: {
          attributes: {
            paymentSource: {
              type: 'wallet',
              walletId
            }
          }
        }
      },
      headers: expectedHeaders
    });
    expect(result.output.paymentId).toBe(paymentId);
    expect(result.output.paymentRequestId).toBe(paymentRequestId);
    expect(result.output.payment).toEqual(fulfilledPayment);
  });
});
