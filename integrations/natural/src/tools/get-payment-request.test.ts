import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { getPaymentRequest } from './payment-requests';

const paymentRequestId = 'prq_550e8400e29b41d4a716446655440000';
const delegatedPartyId = 'pty_019cd1798d6072ef892361085b12fa01';
const requesterPartyId = 'pty_019cd1798d617f65a79cb965dda9eac3';
const payerPartyId = 'pty_019cd1798d627ad9bc302511c4f2c115';
const walletId = 'wal_550e8400e29b41d4a716446655440000';
const payerAgentId = 'agt_019cd1798d637a4da75dce386343931d';
const paymentId = 'pay_550e8400e29b41d4a716446655440000';
const transactionId = 'txn_550e8400e29b41d4a716446655440000';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('get_payment_request', () => {
  it('accepts only documented Natural payment request and delegated party IDs', () => {
    expect(getPaymentRequest.inputSchema.safeParse({ paymentRequestId }).success).toBe(true);
    expect(
      getPaymentRequest.inputSchema.safeParse({ paymentRequestId, partyId: delegatedPartyId })
        .success
    ).toBe(true);

    for (const invalidInput of [
      { paymentRequestId: 'prq_550E8400e29b41d4a716446655440000' },
      { paymentRequestId: 'pay_550e8400e29b41d4a716446655440000' },
      { paymentRequestId: 'prq_invalid' },
      { paymentRequestId, partyId: 'pty_019CD1798d6072ef892361085b12fa01' },
      { paymentRequestId, partyId: 'agt_019cd1798d637a4da75dce386343931d' },
      { paymentRequestId, partyId: 'pty_invalid' }
    ]) {
      expect(getPaymentRequest.inputSchema.safeParse(invalidInput).success).toBe(false);
    }
  });

  it('gets the request without a body and exposes lifecycle, relationships, timestamps, and raw metadata', async () => {
    const paymentRequest = {
      type: 'paymentRequest',
      id: paymentRequestId,
      attributes: {
        amount: 2500,
        currency: 'USD',
        status: 'PROCESSING',
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
        payerIdentifierType: 'agent_id',
        payerIdentifier: payerAgentId,
        paymentLinkUrl: 'https://natural.com/paymentLink/token_123',
        transactionId,
        createdAt: '2026-04-15T00:00:00.000Z',
        updatedAt: '2026-04-15T00:01:00.000Z',
        futurePaymentRequestField: 'preserved'
      },
      relationships: {
        requesterParty: { data: { type: 'party', id: requesterPartyId } },
        wallet: { data: { type: 'wallet', id: walletId } },
        payerParty: { data: { type: 'party', id: payerPartyId } },
        payerAgent: { data: { type: 'agent', id: payerAgentId } },
        payment: { data: { type: 'payment', id: paymentId } }
      },
      futureResourceField: 'preserved'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: paymentRequest
    });

    const result = await getPaymentRequest.handleInvocation({
      input: { paymentRequestId, partyId: delegatedPartyId },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'get payment request',
      'get',
      `/payment-requests/${paymentRequestId}`,
      { params: { partyId: delegatedPartyId } }
    );
    expect(getPaymentRequest.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      paymentRequestId,
      type: 'paymentRequest',
      status: 'PROCESSING',
      amount: 2500,
      currency: 'USD',
      paymentLinkUrl: 'https://natural.com/paymentLink/token_123',
      paymentRequest,
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
      payerIdentifierType: 'agent_id',
      payerIdentifier: payerAgentId,
      payerAgentId,
      transactionId,
      paymentId,
      createdAt: '2026-04-15T00:00:00.000Z',
      updatedAt: '2026-04-15T00:01:00.000Z'
    });
    expect(result.message).toBe(`Retrieved payment request **${paymentRequestId}**.`);
  });
});
