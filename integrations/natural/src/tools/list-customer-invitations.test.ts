import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { listCustomerInvitations } from './customers';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('list_customer_invitations', () => {
  it('uses the documented pagination defaults and bounds', () => {
    expect(listCustomerInvitations.inputSchema.parse({})).toEqual({ limit: 20 });
    expect(listCustomerInvitations.inputSchema.safeParse({ limit: 1 }).success).toBe(true);
    expect(listCustomerInvitations.inputSchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(listCustomerInvitations.inputSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(listCustomerInvitations.inputSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('sends a bodyless GET and exposes recipient, invitation, relationship, timestamp, and raw metadata', async () => {
    const customerPartyId = 'pty_7c9e6679e29b41d4a716446655440001';
    const agentId = 'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f';
    const invitationId = 'adi_550e8400e29b41d4a716446655440000';
    const agentInvitation = {
      invitationId,
      agent: {
        id: agentId,
        name: 'Invoice Agent'
      },
      permissions: ['payments.read'],
      url: `https://www.natural.com/connect/${invitationId}`,
      createdAt: '2026-01-05T10:15:00.000Z',
      expiresAt: '2026-01-12T10:15:00.000Z',
      tags: {
        campaign: 'q3_reactivation'
      },
      futureInvitationField: 'preserved'
    };
    const invitation = {
      type: 'customerInvitation',
      id: 'ops@acme.com',
      attributes: {
        status: 'PENDING',
        party: {
          id: customerPartyId,
          name: 'Acme Co',
          email: 'ops@acme.com',
          avatarUrl: null,
          createdAt: '2025-12-01T08:00:00.000Z'
        },
        email: 'ops@acme.com',
        createdAt: '2026-01-05T10:15:00.000Z',
        agentInvitations: [agentInvitation],
        futureRecipientField: 'preserved'
      },
      relationships: {
        customer: {
          data: {
            type: 'party',
            id: customerPartyId
          }
        }
      },
      futureResourceField: 'preserved'
    };
    const meta = {
      pagination: {
        hasMore: true,
        nextCursor: 'cur_next'
      },
      requestId: 'req_123'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: [invitation],
      meta
    });

    const result = await listCustomerInvitations.handleInvocation({
      input: {
        limit: 25,
        cursor: 'cur_current'
      },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {
        agentId,
        instanceId: 'thread_123'
      }
    } as never);

    expect(request).toHaveBeenCalledWith(
      'list customer invitations',
      'get',
      '/customers/invitations',
      {
        params: {
          cursor: 'cur_current',
          limit: 25
        }
      }
    );
    expect(listCustomerInvitations.outputSchema.parse(result.output)).toEqual({
      invitations: [
        expect.objectContaining({
          id: 'ops@acme.com',
          type: 'customerInvitation',
          attributes: invitation.attributes,
          relationships: invitation.relationships,
          status: 'PENDING',
          recipientEmail: 'ops@acme.com',
          partyId: customerPartyId,
          party: invitation.attributes.party,
          createdAt: '2026-01-05T10:15:00.000Z',
          invitationIds: [invitationId],
          agentIds: [agentId],
          agentInvitations: [
            expect.objectContaining({
              invitationId,
              agentId,
              agentName: 'Invoice Agent',
              agent: agentInvitation.agent,
              permissions: ['payments.read'],
              url: `https://www.natural.com/connect/${invitationId}`,
              createdAt: '2026-01-05T10:15:00.000Z',
              expiresAt: '2026-01-12T10:15:00.000Z',
              tags: agentInvitation.tags,
              invitation: agentInvitation
            })
          ],
          invitation
        })
      ],
      pagination: meta.pagination,
      meta
    });
    expect(result.message).toBe('Found **1** customer invitation recipient groups.');
  });
});
