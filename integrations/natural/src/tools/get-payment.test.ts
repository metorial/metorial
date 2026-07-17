import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { getPayment } from './money-movement';

const paymentId = 'pay_550e8400e29b41d4a716446655440000';
const delegatedPartyId = 'pty_019cd1798d6072ef892361085b12fa01';
const senderPartyId = 'pty_019cd1798d617f65a79cb965dda9eac3';
const senderAgentId = 'agt_019cd1798d637a4da75dce386343931d';
const recipientPartyId = 'pty_019cd1798d627ad9bc302511c4f2c115';
const recipientAgentId = 'agt_019cd1798d647beab4bc53b975c4a42e';
const transactionId = 'txn_550e8400e29b41d4a716446655440000';
const paymentRequestId = 'prq_550e8400e29b41d4a716446655440000';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('get_payment', () => {
  it('accepts only documented Natural payment and delegated party IDs', () => {
    expect(getPayment.inputSchema.safeParse({ paymentId }).success).toBe(true);
    expect(
      getPayment.inputSchema.safeParse({ paymentId, partyId: delegatedPartyId }).success
    ).toBe(true);

    for (const invalidInput of [
      { paymentId: 'pay_550E8400e29b41d4a716446655440000' },
      { paymentId: 'txn_550e8400e29b41d4a716446655440000' },
      { paymentId: 'pay_invalid' },
      { paymentId, partyId: 'pty_019CD1798d6072ef892361085b12fa01' },
      { paymentId, partyId: 'agt_019cd1798d637a4da75dce386343931d' },
      { paymentId, partyId: 'pty_invalid' }
    ]) {
      expect(getPayment.inputSchema.safeParse(invalidInput).success).toBe(false);
    }
  });

  it('gets the payment without a body and exposes money, relationships, timestamps, and raw metadata', async () => {
    const payment = {
      type: 'payment',
      id: paymentId,
      attributes: {
        amount: 500000,
        currency: 'USD',
        status: 'PROCESSING',
        description: 'Payment for Q4 development work',
        createdAt: '2026-01-04T15:30:00Z',
        updatedAt: '2026-01-04T15:31:00Z',
        futurePaymentField: 'preserved'
      },
      relationships: {
        sender: { data: { type: 'party', id: senderPartyId } },
        senderAgent: { data: { type: 'agent', id: senderAgentId } },
        recipient: { data: { type: 'party', id: recipientPartyId } },
        recipientAgent: { data: { type: 'agent', id: recipientAgentId } },
        transaction: { data: { type: 'transaction', id: transactionId } },
        paymentRequest: {
          data: { type: 'paymentRequest', id: paymentRequestId }
        }
      },
      futureResourceField: 'preserved'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: payment
    });

    const result = await getPayment.handleInvocation({
      input: { paymentId, partyId: delegatedPartyId },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith('get payment', 'get', `/payments/${paymentId}`, {
      params: { partyId: delegatedPartyId }
    });
    expect(getPayment.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      paymentId,
      type: 'payment',
      status: 'PROCESSING',
      amount: 500000,
      currency: 'USD',
      payment,
      transactionId,
      senderPartyId,
      senderAgentId,
      recipientPartyId,
      recipientAgentId,
      paymentRequestId,
      description: 'Payment for Q4 development work',
      createdAt: '2026-01-04T15:30:00Z',
      updatedAt: '2026-01-04T15:31:00Z'
    });
    expect(result.message).toBe(`Retrieved payment **${paymentId}**.`);
  });
});
