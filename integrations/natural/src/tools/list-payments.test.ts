import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { listPayments } from './money-movement';

const partyId = 'pty_019cd1798d617f65a79cb965dda9eac3';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('list_payments', () => {
  it('validates Natural party IDs', () => {
    expect(listPayments.inputSchema.safeParse({ partyId }).success).toBe(true);
    expect(listPayments.inputSchema.safeParse({ partyId: 'not-a-party-id' }).success).toBe(
      false
    );
  });

  it('sends documented query parameters and retains payment relationship metadata', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: [
        {
          type: 'payment',
          id: 'pay_550e8400e29b41d4a716446655440000',
          attributes: {
            name: 'Compatibility name',
            displayName: 'Compatibility display name',
            email: 'compatibility@example.com',
            amount: 500000,
            currency: 'USD',
            status: 'PROCESSING',
            description: 'Payment for Q4 development work',
            createdAt: '2026-01-04T15:30:00Z',
            updatedAt: null
          },
          relationships: {
            sender: { data: { type: 'party', id: partyId } },
            senderAgent: {
              data: { type: 'agent', id: 'agt_019cd1798d617f65a79cb965dda9eac3' }
            },
            recipient: {
              data: { type: 'party', id: 'pty_019cd1798d627ad9bc302511c4f2c115' }
            },
            recipientAgent: { data: null },
            transaction: {
              data: { type: 'transaction', id: 'txn_550e8400e29b41d4a716446655440000' }
            },
            paymentRequest: { data: null }
          }
        }
      ],
      meta: {
        pagination: {
          hasMore: true,
          nextCursor: 'cur_next'
        }
      }
    });

    const result = await listPayments.handleInvocation({
      input: { partyId, limit: 10, cursor: 'cur_current' },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith('list payments', 'get', '/payments', {
      params: {
        partyId,
        limit: 10,
        cursor: 'cur_current'
      }
    });
    const parsedOutput = listPayments.outputSchema.parse(result.output);
    expect(parsedOutput.payments[0]).toEqual(
      expect.objectContaining({
        name: 'Compatibility name',
        displayName: 'Compatibility display name',
        email: 'compatibility@example.com'
      })
    );
    expect(result.output).toEqual({
      payments: [
        expect.objectContaining({
          id: 'pay_550e8400e29b41d4a716446655440000',
          paymentId: 'pay_550e8400e29b41d4a716446655440000',
          type: 'payment',
          status: 'PROCESSING',
          amount: 500000,
          currency: 'USD',
          description: 'Payment for Q4 development work',
          updatedAt: null,
          senderPartyId: partyId,
          senderAgentId: 'agt_019cd1798d617f65a79cb965dda9eac3',
          recipientPartyId: 'pty_019cd1798d627ad9bc302511c4f2c115',
          recipientAgentId: undefined,
          transactionId: 'txn_550e8400e29b41d4a716446655440000',
          paymentRequestId: undefined,
          payment: expect.objectContaining({
            id: 'pay_550e8400e29b41d4a716446655440000'
          })
        })
      ],
      pagination: {
        hasMore: true,
        nextCursor: 'cur_next'
      }
    });
  });
});
