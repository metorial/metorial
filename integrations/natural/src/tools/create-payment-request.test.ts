import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { createPaymentRequest } from './payment-requests';

const requesterPartyId = 'pty_019cd1798d617f65a79cb965dda9eac3';
const payerPartyId = 'pty_019cd1798d627ad9bc302511c4f2c115';
const walletId = 'wal_550e8400e29b41d4a716446655440000';
const paymentRequestId = 'prq_550e8400e29b41d4a716446655440000';

const validInput = {
  amount: 2500,
  payer: { type: 'email' as const, value: 'ada@example.com' },
  currency: 'USD' as const,
  description: 'Invoice 7',
  payerName: 'Ada Lovelace',
  walletId,
  customerPartyId: requesterPartyId,
  idempotencyKey: 'create-payment-request-1',
  confirm: true
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('create_payment_request', () => {
  it('enforces documented money, payer, description, and Natural ID constraints', () => {
    expect(createPaymentRequest.inputSchema.safeParse(validInput).success).toBe(true);
    expect(
      createPaymentRequest.inputSchema.safeParse({
        ...validInput,
        payer: { type: 'handle', value: '@ada-agent' }
      }).success
    ).toBe(true);

    for (const invalidInput of [
      { ...validInput, amount: 0 },
      { ...validInput, amount: 10.5 },
      { ...validInput, currency: 'EUR' },
      { ...validInput, description: 'x'.repeat(501) },
      { ...validInput, walletId: 'wallet_123' },
      { ...validInput, customerPartyId: 'party_123' },
      { ...validInput, payer: { type: 'email', value: 'not-an-email' } },
      { ...validInput, payer: { type: 'party_id', value: 'pty_invalid' } },
      { ...validInput, payer: { type: 'agent_id', value: 'agt_invalid' } },
      { ...validInput, payer: { type: 'handle', value: '@invalid handle' } }
    ]) {
      expect(createPaymentRequest.inputSchema.safeParse(invalidInput).success).toBe(false);
    }
  });

  it('requires explicit confirmation and an idempotency key before creating a request', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');
    const context = {
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    };

    await expect(
      createPaymentRequest.handleInvocation({
        ...context,
        input: { ...validInput, confirm: false }
      } as never)
    ).rejects.toThrow(/confirm/i);
    await expect(
      createPaymentRequest.handleInvocation({
        ...context,
        input: { ...validInput, idempotencyKey: undefined }
      } as never)
    ).rejects.toThrow(/idempotencyKey/);
    expect(request).not.toHaveBeenCalled();
  });

  it('posts the documented JSON:API attributes and exposes lifecycle and relationship metadata', async () => {
    const paymentRequest = {
      type: 'paymentRequest',
      id: paymentRequestId,
      attributes: {
        amount: 2500,
        currency: 'USD',
        status: 'OPEN',
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
        payerIdentifierType: 'email',
        payerIdentifier: 'ada@example.com',
        paymentLinkUrl: 'https://natural.com/paymentLink/token_123',
        transactionId: null,
        createdAt: '2026-04-15T00:00:00.000Z',
        updatedAt: '2026-04-15T00:00:00.000Z'
      },
      relationships: {
        requesterParty: { data: { type: 'party', id: requesterPartyId } },
        payerParty: { data: { type: 'party', id: payerPartyId } }
      }
    };
    const request = vi
      .spyOn(NaturalClient.prototype, 'request')
      .mockResolvedValue({ data: paymentRequest });

    const result = await createPaymentRequest.handleInvocation({
      input: validInput,
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'create payment request',
      'post',
      '/payment-requests',
      {
        idempotencyKey: 'create-payment-request-1',
        body: {
          data: {
            attributes: {
              amount: 2500,
              payer: { type: 'email', value: 'ada@example.com' },
              currency: 'USD',
              description: 'Invoice 7',
              payerName: 'Ada Lovelace',
              walletId,
              customerPartyId: requesterPartyId
            }
          }
        }
      }
    );
    expect(createPaymentRequest.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      paymentRequestId,
      type: 'paymentRequest',
      status: 'OPEN',
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
      payerName: 'Ada Lovelace',
      payerEmail: 'ada@example.com',
      payerAvatarUrl: 'https://natural.test/payer.png',
      payerPhone: null,
      payerPartyId,
      payerIdentifierType: 'email',
      payerIdentifier: 'ada@example.com',
      transactionId: null,
      createdAt: '2026-04-15T00:00:00.000Z',
      updatedAt: '2026-04-15T00:00:00.000Z'
    });
    expect(result.message).toBe(`Created payment request **${paymentRequestId}**.`);
  });
});
