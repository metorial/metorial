import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { cancelPayment } from './money-movement';

const paymentId = 'pay_550e8400e29b41d4a716446655440000';
const senderPartyId = 'pty_019cd1798d617f65a79cb965dda9eac3';
const recipientPartyId = 'pty_019cd1798d627ad9bc302511c4f2c115';
const recipientAgentId = 'agt_019cd1798d637a4da75dce386343931d';
const transactionId = 'txn_550e8400e29b41d4a716446655440000';

const validInput = {
  paymentId,
  idempotencyKey: 'cancel-payment-1',
  confirm: true
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('cancel_payment', () => {
  it('accepts only documented Natural payment IDs', () => {
    expect(cancelPayment.inputSchema.safeParse(validInput).success).toBe(true);

    for (const invalidPaymentId of [
      'pay_550E8400e29b41d4a716446655440000',
      'pay_invalid',
      'txn_550e8400e29b41d4a716446655440000'
    ]) {
      expect(
        cancelPayment.inputSchema.safeParse({ ...validInput, paymentId: invalidPaymentId })
          .success
      ).toBe(false);
    }
  });

  it('requires explicit confirmation and an idempotency key before requesting cancellation', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');
    const context = {
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    };

    await expect(
      cancelPayment.handleInvocation({
        ...context,
        input: { ...validInput, confirm: false }
      } as never)
    ).rejects.toThrow(/confirm/i);
    await expect(
      cancelPayment.handleInvocation({
        ...context,
        input: { ...validInput, idempotencyKey: undefined }
      } as never)
    ).rejects.toThrow(/idempotencyKey/);
    expect(request).not.toHaveBeenCalled();
  });

  it('posts without a body and exposes canceled payment relationships and timestamps', async () => {
    const payment = {
      type: 'payment',
      id: paymentId,
      attributes: {
        amount: 500000,
        currency: 'USD',
        status: 'CANCELED',
        description: 'Payment for Q4 development work',
        createdAt: '2026-01-04T15:30:00Z',
        updatedAt: '2026-01-04T15:35:00Z',
        futurePaymentField: 'preserved'
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
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: payment
    });

    const result = await cancelPayment.handleInvocation({
      input: validInput,
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'cancel payment',
      'post',
      `/payments/${paymentId}/cancel`,
      { idempotencyKey: 'cancel-payment-1' }
    );
    expect(cancelPayment.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      paymentId,
      transactionId,
      senderPartyId,
      senderAgentId: undefined,
      recipientPartyId,
      recipientAgentId,
      paymentRequestId: undefined,
      type: 'payment',
      status: 'CANCELED',
      amount: 500000,
      currency: 'USD',
      description: 'Payment for Q4 development work',
      createdAt: '2026-01-04T15:30:00Z',
      updatedAt: '2026-01-04T15:35:00Z',
      payment
    });
    expect(result.message).toBe(`Canceled payment **${paymentId}**.`);
  });
});
