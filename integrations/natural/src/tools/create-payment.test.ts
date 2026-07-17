import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { createPayment } from './money-movement';

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

const senderPartyId = 'pty_019cd1798d617f65a79cb965dda9eac3';
const recipientPartyId = 'pty_019cd1798d627ad9bc302511c4f2c115';
const recipientAgentId = 'agt_019cd1798d637a4da75dce386343931d';
const walletId = 'wal_550e8400e29b41d4a716446655440000';
const paymentId = 'pay_550e8400e29b41d4a716446655440000';
const transactionId = 'txn_550e8400e29b41d4a716446655440000';

const validInput = {
  amount: 500000,
  counterparty: { type: 'agent_id' as const, value: recipientAgentId },
  currency: 'USD' as const,
  description: 'Payment for Q4 development work',
  walletId,
  customerPartyId: senderPartyId,
  idempotencyKey: 'create-payment-1',
  confirm: true
};

afterEach(() => {
  vi.restoreAllMocks();
  axiosRequest.mockReset();
});

describe('create_payment', () => {
  it('enforces documented money and Natural resource constraints', () => {
    expect(createPayment.inputSchema.safeParse(validInput).success).toBe(true);

    for (const invalidInput of [
      { ...validInput, amount: 0 },
      { ...validInput, amount: 10.5 },
      { ...validInput, currency: 'EUR' },
      { ...validInput, walletId: 'wallet_123' },
      { ...validInput, customerPartyId: 'party_123' },
      { ...validInput, counterparty: { type: 'email', value: 'not-an-email' } },
      { ...validInput, counterparty: { type: 'party_id', value: 'pty_invalid' } },
      { ...validInput, counterparty: { type: 'agent_id', value: 'agt_invalid' } },
      { ...validInput, counterparty: { type: 'handle', value: '@invalid handle' } }
    ]) {
      expect(createPayment.inputSchema.safeParse(invalidInput).success).toBe(false);
    }
  });

  it('requires explicit confirmation and an idempotency key before requesting payment creation', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');
    const context = {
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    };

    await expect(
      createPayment.handleInvocation({
        ...context,
        input: { ...validInput, confirm: false }
      } as never)
    ).rejects.toThrow(/confirm/i);
    await expect(
      createPayment.handleInvocation({
        ...context,
        input: { ...validInput, idempotencyKey: undefined }
      } as never)
    ).rejects.toThrow(/idempotencyKey/);
    expect(request).not.toHaveBeenCalled();
  });

  it('rejects an agent-key payment without an instance ID before HTTP dispatch', async () => {
    const error = await createPayment
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
      config: { instanceId: 'payment-run-123' },
      expectedHeaders: {
        'Idempotency-Key': 'create-payment-1',
        'X-Instance-ID': 'payment-run-123'
      }
    },
    {
      keyType: 'party_key' as const,
      config: {},
      expectedHeaders: {
        'Idempotency-Key': 'create-payment-1'
      }
    }
  ])('keeps the create-payment contract for $keyType authentication', async ({
    keyType,
    config,
    expectedHeaders
  }) => {
    const payment = {
      type: 'payment',
      id: paymentId,
      attributes: {
        amount: 500000,
        currency: 'USD',
        status: 'PROCESSING'
      },
      relationships: {}
    };
    axiosRequest.mockResolvedValue({ data: { data: payment } });

    const result = await createPayment.handleInvocation({
      input: validInput,
      auth: { token: `${keyType}_test`, keyType },
      config
    } as never);

    expect(axiosRequest).toHaveBeenCalledWith({
      method: 'post',
      url: '/payments',
      params: undefined,
      data: {
        data: {
          attributes: {
            amount: 500000,
            counterparty: { type: 'agent_id', value: recipientAgentId },
            currency: 'USD',
            description: 'Payment for Q4 development work',
            walletId,
            customerPartyId: senderPartyId
          }
        }
      },
      headers: expectedHeaders
    });
    expect(result.output.paymentId).toBe(paymentId);
    expect(result.output.payment).toEqual(payment);
  });

  it('posts the documented attributes envelope and exposes payment relationship IDs', async () => {
    const payment = {
      type: 'payment',
      id: paymentId,
      attributes: {
        amount: 500000,
        currency: 'USD',
        status: 'PROCESSING',
        description: 'Payment for Q4 development work',
        createdAt: '2026-01-04T15:30:00Z',
        updatedAt: '2026-01-04T15:31:00Z'
      },
      relationships: {
        sender: { data: { type: 'party', id: senderPartyId } },
        senderAgent: { data: null },
        recipient: { data: { type: 'party', id: recipientPartyId } },
        recipientAgent: { data: { type: 'agent', id: recipientAgentId } },
        transaction: { data: { type: 'transaction', id: transactionId } },
        paymentRequest: { data: null }
      }
    };
    const request = vi
      .spyOn(NaturalClient.prototype, 'request')
      .mockResolvedValue({ data: payment });

    const result = await createPayment.handleInvocation({
      input: validInput,
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith('create payment', 'post', '/payments', {
      requiresAgentInstance: true,
      idempotencyKey: 'create-payment-1',
      body: {
        data: {
          attributes: {
            amount: 500000,
            counterparty: { type: 'agent_id', value: recipientAgentId },
            currency: 'USD',
            description: 'Payment for Q4 development work',
            walletId,
            customerPartyId: senderPartyId
          }
        }
      }
    });
    expect(createPayment.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      paymentId,
      transactionId,
      senderPartyId,
      senderAgentId: undefined,
      recipientPartyId,
      recipientAgentId,
      paymentRequestId: undefined,
      type: 'payment',
      status: 'PROCESSING',
      amount: 500000,
      currency: 'USD',
      description: 'Payment for Q4 development work',
      createdAt: '2026-01-04T15:30:00Z',
      updatedAt: '2026-01-04T15:31:00Z',
      payment
    });
    expect(result.message).toBe(`Created payment **${paymentId}**.`);
  });
});
