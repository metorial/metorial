import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { createCustomerInvitations } from './customers';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('create_customer_invitations', () => {
  const agentId = 'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f';

  const validInput = {
    recipients: [{ type: 'email' as const, value: 'ops@acme.com' }],
    agents: [
      {
        agentId,
        permissions: ['payments.read' as const],
        limits: { perTransaction: 100000 }
      }
    ],
    expiresAt: '2026-08-12T10:15:00.000Z',
    tags: { campaign: 'q3_reactivation' }
  };

  const invocationContext = (input = validInput) =>
    ({
      input,
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    }) as never;

  it('enforces the documented recipient, agent, permission, timestamp, and metadata constraints', () => {
    expect(createCustomerInvitations.inputSchema.safeParse(validInput).success).toBe(true);
    expect(
      createCustomerInvitations.inputSchema.safeParse({
        ...validInput,
        recipients: [{ type: 'email', value: 'not-an-email' }]
      }).success
    ).toBe(false);
    expect(
      createCustomerInvitations.inputSchema.safeParse({
        ...validInput,
        recipients: [{ type: 'party_id', value: 'pty_invalid' }]
      }).success
    ).toBe(false);
    expect(
      createCustomerInvitations.inputSchema.safeParse({
        ...validInput,
        agents: [{ agentId: 'agt_invalid', permissions: ['payments.read'] }]
      }).success
    ).toBe(false);
    expect(
      createCustomerInvitations.inputSchema.safeParse({
        ...validInput,
        agents: [{ agentId, permissions: ['unknown.permission'] }]
      }).success
    ).toBe(false);
    expect(
      createCustomerInvitations.inputSchema.safeParse({
        ...validInput,
        expiresAt: 'not-a-timestamp'
      }).success
    ).toBe(false);
    expect(
      createCustomerInvitations.inputSchema.safeParse({
        ...validInput,
        tags: { 'campaign-name': 'q3_reactivation' }
      }).success
    ).toBe(false);
    expect(
      createCustomerInvitations.inputSchema.safeParse({
        ...validInput,
        tags: { campaign: 'x'.repeat(257) }
      }).success
    ).toBe(false);
  });

  it('accepts an expiration exactly 90 days away and rejects one millisecond later', () => {
    vi.useFakeTimers();
    vi.setSystemTime('2026-07-16T10:15:00.000Z');

    expect(
      createCustomerInvitations.inputSchema.safeParse({
        ...validInput,
        expiresAt: '2026-10-14T10:15:00.000Z'
      }).success
    ).toBe(true);
    expect(
      createCustomerInvitations.inputSchema.safeParse({
        ...validInput,
        expiresAt: '2026-10-14T10:15:00.001Z'
      }).success
    ).toBe(false);
  });

  it('posts the documented body without idempotency and exposes actionable invitation metadata', async () => {
    const invitationId = 'adi_550e8400e29b41d4a716446655440000';
    const invitation = {
      type: 'agentDelegationInvitation',
      id: invitationId,
      attributes: {
        developerName: 'Acme Co',
        email: 'ops@acme.com',
        phone: null,
        url: `https://www.natural.com/connect/${invitationId}`,
        agentName: 'Invoice Agent',
        permissions: ['payments.read'],
        limits: { perTransaction: 100000 },
        status: 'PENDING',
        effectiveStatus: 'PENDING',
        expiresAt: '2026-08-12T10:15:00.000Z',
        acceptedAt: null,
        declinedAt: null,
        cancelReason: null,
        tags: { campaign: 'q3_reactivation' },
        createdAt: '2026-07-16T10:15:00.000Z',
        updatedAt: '2026-07-16T10:15:00.000Z',
        futureInvitationField: 'preserved'
      },
      relationships: {
        agent: { data: { type: 'agent', id: agentId } },
        customerParty: { data: null }
      },
      futureResourceField: 'preserved'
    };
    const failedRecipient = {
      recipient: { type: 'phone', value: '+15555550123' },
      reason: 'Recipient cannot receive SMS invitations.',
      futureFailureField: 'preserved'
    };
    const meta = {
      failedRecipients: [failedRecipient],
      requestId: 'req_123',
      futureMetaField: 'preserved'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: [invitation],
      meta
    });

    const result = await createCustomerInvitations.handleInvocation(invocationContext());

    expect(request).toHaveBeenCalledWith(
      'create customer invitations',
      'post',
      '/customers/invitations',
      {
        body: {
          data: {
            attributes: {
              recipients: validInput.recipients,
              agents: validInput.agents,
              expiresAt: validInput.expiresAt,
              tags: validInput.tags
            }
          }
        }
      }
    );
    expect(createCustomerInvitations.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      invitationIds: [invitationId],
      invitations: [
        {
          invitationId,
          type: 'agentDelegationInvitation',
          status: 'PENDING',
          effectiveStatus: 'PENDING',
          recipient: {
            email: 'ops@acme.com',
            phone: null,
            customerPartyId: null
          },
          url: `https://www.natural.com/connect/${invitationId}`,
          agentId,
          agentName: 'Invoice Agent',
          permissions: ['payments.read'],
          limits: { perTransaction: 100000 },
          expiresAt: '2026-08-12T10:15:00.000Z',
          acceptedAt: null,
          declinedAt: null,
          cancelReason: null,
          tags: { campaign: 'q3_reactivation' },
          createdAt: '2026-07-16T10:15:00.000Z',
          updatedAt: '2026-07-16T10:15:00.000Z',
          relationships: invitation.relationships,
          invitation
        }
      ],
      failedRecipients: [failedRecipient],
      meta
    });
    expect(result.message).toBe(
      'Created **1** customer invitation; **1** recipient failed. Retry only failed recipients to avoid duplicate invitations.'
    );
  });

  it.each([
    ['data', { meta: { failedRecipients: [] } }],
    ['data array', { data: {}, meta: { failedRecipients: [] } }],
    ['invitation resource', { data: [{}], meta: { failedRecipients: [] } }],
    ['meta', { data: [] }],
    ['failedRecipients', { data: [], meta: { failedRecipients: {} } }]
  ])('rejects a malformed successful response with invalid %s', async (_field, response) => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

    const invocation = createCustomerInvitations.handleInvocation(invocationContext());

    await expect(invocation).rejects.toBeInstanceOf(ServiceError);
    await expect(invocation).rejects.toThrow(/malformed success response/i);
  });
});
