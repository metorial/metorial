import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { listPartyInvitations } from './admin';

const partyId = 'opaque-party-id/v2';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('list_party_invitations', () => {
  it('validates the documented filters and pagination constraints', () => {
    expect(
      listPartyInvitations.inputSchema.parse({
        partyId,
        email: 'engineer@example.com',
        status: 'PENDING'
      })
    ).toEqual({
      partyId,
      email: 'engineer@example.com',
      status: 'PENDING',
      limit: 50
    });
    expect(listPartyInvitations.inputSchema.safeParse({ limit: 1 }).success).toBe(true);
    expect(listPartyInvitations.inputSchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(listPartyInvitations.inputSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(listPartyInvitations.inputSchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(
      listPartyInvitations.inputSchema.safeParse({ partyId: 'future-party-format' }).success
    ).toBe(true);
    expect(listPartyInvitations.inputSchema.safeParse({ partyId: '' }).success).toBe(false);
  });

  it('sends a bodyless paginated GET and exposes invitation lifecycle and raw metadata', async () => {
    const invitationId = 'inv_019cd4a832f37c4b8a1d63e94b7c8d12';
    const invitation = {
      type: 'invitation',
      id: invitationId,
      attributes: {
        email: 'engineer@example.com',
        role: 'MEMBER',
        status: 'PENDING',
        expiresAt: '2026-01-11T15:30:00Z',
        createdAt: '2026-01-04T15:30:00Z',
        acceptedAt: null,
        futureInvitationAttribute: 'preserved'
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: partyId
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

    const result = await listPartyInvitations.handleInvocation({
      input: {
        partyId,
        email: 'engineer@example.com',
        status: 'PENDING',
        limit: 25,
        cursor: 'cur_current'
      },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {
        agentId: 'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
        instanceId: 'thread_123'
      }
    } as never);

    expect(request).toHaveBeenCalledWith(
      'list party invitations',
      'get',
      '/party-invitations',
      {
        params: {
          partyId,
          email: 'engineer@example.com',
          status: 'PENDING',
          limit: 25,
          cursor: 'cur_current'
        }
      }
    );
    expect(listPartyInvitations.outputSchema.parse(result.output)).toEqual({
      invitations: [
        {
          id: invitationId,
          invitationId,
          type: 'invitation',
          email: 'engineer@example.com',
          recipientEmail: 'engineer@example.com',
          role: 'MEMBER',
          status: 'PENDING',
          expiresAt: '2026-01-11T15:30:00Z',
          createdAt: '2026-01-04T15:30:00Z',
          acceptedAt: null,
          attributes: invitation.attributes,
          relationships: invitation.relationships,
          invitation
        }
      ],
      pagination: meta.pagination,
      meta
    });
    expect(result.message).toBe('Found **1** party invitations.');
  });
});
