import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { inviteAgentCustomer } from './agents';
import { createCustomerInvitations } from './customers';

const agentId = 'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f';
const customerPartyId = 'pty_7c9e6679e29b41d4a716446655440001';

const validInput = {
  agentId,
  recipients: [
    { type: 'email' as const, value: 'ops@acme.com' },
    { type: 'phone' as const, value: '+15555550123' },
    { type: 'party_id' as const, value: customerPartyId }
  ],
  permissions: ['payments.read' as const, 'payments.create' as const],
  limits: { perTransaction: 100000 },
  expiresAt: '2026-07-23T10:15:00.000Z',
  idempotencyKey: 'invite-agent-customers-1'
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('invite_agent_customer', () => {
  it('is deprecated in favor of create_customer_invitations', () => {
    expect(inviteAgentCustomer.key).toBe('invite_agent_customer');
    expect(createCustomerInvitations.key).toBe('create_customer_invitations');
    expect(inviteAgentCustomer.description).toMatch(
      /^DEPRECATED — use `create_customer_invitations` instead\. /
    );
    expect(inviteAgentCustomer.tags).toMatchObject({ deprecated: true });
    expect(inviteAgentCustomer.instructions).toEqual(
      expect.arrayContaining([expect.stringContaining('`create_customer_invitations`')])
    );
  });

  it('enforces the documented agent, recipient, permission, timestamp, and batch constraints', () => {
    expect(inviteAgentCustomer.inputSchema.safeParse(validInput).success).toBe(true);
    expect(
      inviteAgentCustomer.inputSchema.safeParse({ ...validInput, agentId: 'agt_invalid' })
        .success
    ).toBe(false);
    expect(
      inviteAgentCustomer.inputSchema.safeParse({
        ...validInput,
        recipients: [{ type: 'email', value: 'not-an-email' }]
      }).success
    ).toBe(false);
    expect(
      inviteAgentCustomer.inputSchema.safeParse({
        ...validInput,
        recipients: [{ type: 'party_id', value: 'pty_invalid' }]
      }).success
    ).toBe(false);
    expect(
      inviteAgentCustomer.inputSchema.safeParse({
        ...validInput,
        recipients: Array.from({ length: 101 }, (_, index) => ({
          type: 'email',
          value: `recipient-${index}@example.com`
        }))
      }).success
    ).toBe(false);
    expect(
      inviteAgentCustomer.inputSchema.safeParse({
        ...validInput,
        permissions: ['unknown.permission']
      }).success
    ).toBe(false);
    expect(
      inviteAgentCustomer.inputSchema.safeParse({
        ...validInput,
        expiresAt: 'not-a-timestamp'
      }).success
    ).toBe(false);
    expect(
      inviteAgentCustomer.inputSchema.safeParse({ ...validInput, idempotencyKey: '' }).success
    ).toBe(false);
    const parsedInputWithTags = inviteAgentCustomer.inputSchema.safeParse({
      ...validInput,
      tags: { campaign: 'unsupported' }
    });
    expect(parsedInputWithTags.success).toBe(true);
    if (parsedInputWithTags.success) {
      expect(parsedInputWithTags.data).not.toHaveProperty('tags');
    }
    expect(inviteAgentCustomer.description).toContain('idempotency key');
    expect(inviteAgentCustomer.constraints).toEqual(
      expect.arrayContaining([
        expect.stringContaining('email invitations automatically'),
        expect.stringContaining('defaults to 7 days')
      ])
    );
  });

  it('requires an idempotency key before sending invitations', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');

    await expect(
      inviteAgentCustomer.handleInvocation({
        input: { ...validInput, idempotencyKey: undefined },
        auth: { token: 'sk_ntl_test', keyType: 'party_key' },
        config: {}
      } as never)
    ).rejects.toThrow(/idempotencyKey/i);
    expect(request).not.toHaveBeenCalled();
  });

  it('posts the flat SDK body with idempotency and preserves raw invitation resources', async () => {
    const invitationId = 'adi_550e8400e29b41d4a716446655440000';
    const invitation = {
      type: 'customerInvitation',
      id: invitationId,
      attributes: {
        recipient: {
          type: 'email',
          value: 'ops@acme.com',
          futureRecipientField: 'preserved'
        },
        status: 'PENDING',
        permissions: ['payments.read', 'payments.create'],
        limits: { perTransaction: 100000 },
        expiresAt: '2026-07-23T10:15:00.000Z',
        createdAt: '2026-07-16T10:15:00.000Z',
        updatedAt: null,
        futureInvitationAttribute: 'preserved'
      },
      relationships: {
        agent: {
          data: {
            type: 'agent',
            id: agentId,
            attributes: {
              name: 'Invoice Agent',
              description: null,
              status: 'ACTIVE',
              futureAgentField: 'preserved'
            }
          }
        },
        customerParty: {
          data: { type: 'party', id: customerPartyId }
        }
      },
      futureResourceField: 'preserved'
    };
    const meta = {
      emailFailures: [invitationId],
      requestId: 'req_123',
      futureMetaField: 'preserved'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: [invitation],
      meta
    });

    const result = await inviteAgentCustomer.handleInvocation({
      input: validInput,
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'invite agent customer',
      'post',
      `/agents/${agentId}/customers`,
      {
        idempotencyKey: 'invite-agent-customers-1',
        body: {
          recipients: validInput.recipients,
          permissions: validInput.permissions,
          limits: validInput.limits,
          expiresAt: validInput.expiresAt
        }
      }
    );
    expect(inviteAgentCustomer.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      invitationIds: [invitationId],
      invitations: [invitation],
      emailFailures: [invitationId],
      meta
    });
    expect(result.output.invitations[0]?.id).toBe(invitationId);
    expect(result.output.invitations[0]?.attributes).toEqual(invitation.attributes);
    expect(result.message).toContain('Created **1** agent customer invitations.');
    expect(result.message).toContain('could not send email for **1** persisted invitations');
  });

  it('accepts additive invitation and agent status strings in a successful response', async () => {
    const invitation = {
      type: 'customerInvitation',
      id: 'adi_550e8400e29b41d4a716446655440000',
      attributes: {
        recipient: { type: 'email', value: 'ops@acme.com' },
        status: 'DELIVERY_SCHEDULED',
        permissions: ['payments.read'],
        limits: null,
        expiresAt: '2026-07-23T10:15:00.000Z',
        createdAt: '2026-07-16T10:15:00.000Z',
        updatedAt: null
      },
      relationships: {
        agent: {
          data: {
            type: 'agent',
            id: agentId,
            attributes: {
              name: 'Invoice Agent',
              description: null,
              status: 'PAUSED'
            }
          }
        },
        customerParty: { data: null }
      }
    };
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: [invitation],
      meta: { emailFailures: [] }
    });

    const result = await inviteAgentCustomer.handleInvocation({
      input: validInput,
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(result.output.invitations).toEqual([invitation]);
    expect(inviteAgentCustomer.outputSchema.parse(result.output)).toEqual(result.output);
  });

  it.each([
    ['data', { meta: { emailFailures: [] } }],
    ['data array', { data: {}, meta: { emailFailures: [] } }],
    [
      'complete invitation resource',
      {
        data: [
          {
            type: 'customerInvitation',
            id: 'adi_550e8400e29b41d4a716446655440000',
            attributes: {},
            relationships: {}
          }
        ],
        meta: { emailFailures: [] }
      }
    ],
    ['meta', { data: [] }],
    ['emailFailures', { data: [], meta: {} }],
    ['emailFailures array', { data: [], meta: { emailFailures: {} } }],
    ['emailFailures item', { data: [], meta: { emailFailures: [42] } }]
  ])('rejects a malformed successful response with invalid %s', async (_field, response) => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

    const error = await inviteAgentCustomer
      .handleInvocation({
        input: validInput,
        auth: { token: 'sk_ntl_test', keyType: 'party_key' },
        config: {}
      } as never)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/malformed success response/i);
    expect(error.message).toMatch(/verify invitation state/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });
});
