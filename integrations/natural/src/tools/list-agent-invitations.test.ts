import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { NaturalClient } from '../lib/client';
import { listAgentInvitations } from './agents';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('list_agent_invitations', () => {
  it('uses an MCP-compatible top-level object schema', () => {
    const jsonSchema = z.toJSONSchema(listAgentInvitations.inputSchema) as Record<
      string,
      unknown
    >;

    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema).not.toHaveProperty('oneOf');
    expect(jsonSchema).not.toHaveProperty('anyOf');
    expect(jsonSchema).not.toHaveProperty('allOf');
  });

  it('preserves the legacy string filters, status enum, and pagination bounds', () => {
    expect(listAgentInvitations.inputSchema.parse({})).toEqual({ limit: 50 });
    expect(
      listAgentInvitations.inputSchema.safeParse({
        status: ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELED'],
        customerEmail: 'legacy-customer-reference',
        agentId: 'legacy-agent-reference',
        limit: 1
      }).success
    ).toBe(true);
    expect(
      listAgentInvitations.inputSchema.safeParse({
        customerEmail: '',
        agentId: ''
      }).success
    ).toBe(true);
    expect(listAgentInvitations.inputSchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(listAgentInvitations.inputSchema.safeParse({ status: ['UNKNOWN'] }).success).toBe(
      false
    );
    expect(listAgentInvitations.inputSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(listAgentInvitations.inputSchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(listAgentInvitations.tags).toMatchObject({ readOnly: true, deprecated: true });
    expect(listAgentInvitations.description).toContain('provider-deprecated legacy endpoint');
    expect(listAgentInvitations.description).not.toMatch(/use `.+` instead/i);
    expect(listAgentInvitations.instructions).toEqual([
      'Retain this tool only for compatibility with existing workflows. Natural has no documented current equivalent.'
    ]);
    expect(listAgentInvitations.instructions?.join(' ')).not.toMatch(
      /list_customer_invitations/i
    );
    expect(listAgentInvitations.constraints).toEqual([
      'Natural marks this provider endpoint as deprecated and has no documented current equivalent.'
    ]);
  });

  it('sends a bodyless GET with repeated statuses and preserves raw resources and metadata', async () => {
    const invitationId = 'adi_550e8400e29b41d4a716446655440000';
    const agentId = 'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f';
    const customerPartyId = 'pty_7c9e6679e29b41d4a716446655440001';
    const invitation = {
      type: 'agentDelegationInvitation',
      id: invitationId,
      attributes: {
        developerName: 'Acme Co',
        email: 'ops@customer.example',
        phone: null,
        url: `https://www.natural.com/connect/${invitationId}`,
        agentName: 'Invoice Agent',
        permissions: ['payments.read', 'payments.create'],
        limits: { perTransaction: 100000 },
        status: 'ACCEPTED',
        effectiveStatus: 'ACCEPTED',
        expiresAt: '2026-07-23T10:15:00.000Z',
        acceptedAt: '2026-07-17T09:00:00.000Z',
        declinedAt: null,
        cancelReason: null,
        tags: { campaign: 'q3_reactivation' },
        createdAt: '2026-07-16T10:15:00.000Z',
        updatedAt: '2026-07-17T09:00:00.000Z',
        futureInvitationAttribute: 'preserved'
      },
      relationships: {
        agent: {
          data: { type: 'agent', id: agentId }
        },
        customerParty: {
          data: { type: 'party', id: customerPartyId }
        },
        futureRelationship: {
          data: { type: 'futureResource', id: 'future_123' }
        }
      },
      futureResourceField: 'preserved'
    };
    const meta = {
      pagination: {
        hasMore: true,
        nextCursor: 'cur_next',
        futurePaginationField: 'preserved'
      },
      requestId: 'req_123',
      futureMetaField: 'preserved'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: [invitation],
      meta
    });

    const result = await listAgentInvitations.handleInvocation({
      input: {
        status: ['PENDING', 'ACCEPTED'],
        customerEmail: 'ops@customer.example',
        agentId,
        limit: 25,
        cursor: 'cur_current'
      },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'list agent invitations',
      'get',
      '/agents/invitations',
      {
        params: {
          status: ['PENDING', 'ACCEPTED'],
          customerEmail: 'ops@customer.example',
          agentId,
          limit: 25,
          cursor: 'cur_current'
        }
      }
    );
    expect(listAgentInvitations.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      invitations: [invitation],
      pagination: meta.pagination,
      meta
    });
    expect(result.output).not.toHaveProperty('invitationIds');
    expect(result.message).toBe('Found **1** agent invitations.');
  });

  it.each([
    ['missing data', { meta: { pagination: { hasMore: false, nextCursor: null } } }],
    [
      'non-array data',
      { data: {}, meta: { pagination: { hasMore: false, nextCursor: null } } }
    ],
    ['missing meta', { data: [] }],
    ['missing pagination', { data: [], meta: {} }],
    [
      'malformed pagination',
      { data: [], meta: { pagination: { hasMore: 'false', nextCursor: null } } }
    ]
  ])('rejects a malformed legacy success response with %s', async (_case, response) => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

    const invocation = listAgentInvitations.handleInvocation({
      input: { limit: 50 },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    const error = await invocation.catch(cause => cause);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;
    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/malformed success response/i);
    expect(error.message).toMatch(/read-only request.*safe to retry/i);
  });
});
