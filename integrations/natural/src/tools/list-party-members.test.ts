import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { listPartyMembers } from './admin';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('list_party_members', () => {
  it('uses the documented pagination default and bounds', () => {
    expect(listPartyMembers.inputSchema.parse({})).toEqual({ limit: 50 });
    expect(listPartyMembers.inputSchema.safeParse({ limit: 1 }).success).toBe(true);
    expect(listPartyMembers.inputSchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(listPartyMembers.inputSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(listPartyMembers.inputSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('sends a bodyless paginated GET and exposes documented user identity and raw additive data', async () => {
    const userId = 'usr_019cd1798d657de5b5fed4198cb9fac0';
    const partyId = 'pty_019cd1798d617f65a79cb965dda9eac3';
    const member = {
      type: 'user',
      id: userId,
      attributes: {
        partyId,
        memberId: 'undocumented-member-id',
        role: 'MEMBER',
        status: 'ACTIVE',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        firstName: 'Eric',
        lastName: 'Smith',
        email: 'eric@natural.com',
        futureMemberAttribute: 'preserved'
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: partyId
          }
        },
        futureRelationshipField: 'preserved'
      },
      futureResourceField: 'preserved'
    };
    const meta = {
      pagination: {
        hasMore: true,
        nextCursor: 'cur_next'
      },
      requestId: 'req_123',
      futureMetaField: 'preserved'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: [member],
      meta
    });

    const result = await listPartyMembers.handleInvocation({
      input: {
        limit: 25,
        cursor: 'cur_current'
      },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {
        agentId: 'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
        instanceId: 'thread_123'
      }
    } as never);

    expect(listPartyMembers.tags).toMatchObject({ readOnly: true });
    expect(listPartyMembers.description).toContain('Natural user IDs');
    expect(listPartyMembers.description).not.toContain('member IDs');
    expect(listPartyMembers.description).not.toContain('relationships');
    expect(request).toHaveBeenCalledWith('list party members', 'get', '/parties/me/members', {
      params: {
        cursor: 'cur_current',
        limit: 25
      }
    });
    expect(listPartyMembers.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      members: [
        {
          id: userId,
          userId,
          type: 'user',
          partyId,
          name: 'Eric Smith',
          firstName: 'Eric',
          lastName: 'Smith',
          email: 'eric@natural.com',
          role: 'MEMBER',
          status: 'ACTIVE',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
          attributes: member.attributes,
          relationships: member.relationships,
          member
        }
      ],
      pagination: meta.pagination,
      meta
    });
    expect(result.message).toBe('Found **1** party members.');
  });
});
