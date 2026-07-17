import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { revokeAgentInvitation } from './agents';
import { revokeCustomerInvitation } from './customers';

const invitationId = 'adi_550E8400/opaque?region=#東京';
const idempotencyKey = 'revoke-agent-invitation-1';

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
    status: 'CANCELED',
    effectiveStatus: 'CANCELED',
    expiresAt: '2026-08-12T10:15:00.000Z',
    acceptedAt: null,
    declinedAt: null,
    cancelReason: 'DEVELOPER_REVOKED',
    tags: { campaign: 'q3_reactivation' },
    createdAt: '2026-07-16T10:15:00.000Z',
    updatedAt: '2026-07-16T10:20:00.000Z',
    futureInvitationField: 'preserved'
  },
  relationships: {
    agent: {
      data: {
        type: 'agent',
        id: 'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
        futureAgentField: 'preserved'
      },
      futureAgentRelationshipField: 'preserved'
    },
    customerParty: { data: null },
    futureRelationshipField: {
      data: { type: 'futureResource', id: 'future_123' }
    }
  },
  futureResourceField: 'preserved'
};

const minimalSuccessfulResponse = {
  data: {
    type: 'agentDelegationInvitation',
    id: invitationId,
    attributes: { status: 'CANCELED' },
    relationships: {
      agent: { data: { type: 'agent', id: 'agt_opaque' } },
      customerParty: { data: null }
    }
  },
  meta: { deleted: true }
};

const invocationContext = {
  input: { id: invitationId, idempotencyKey, confirm: true },
  auth: { token: 'sk_ntl_test', keyType: 'party_key' },
  config: {}
} as never;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('revoke_agent_invitation', () => {
  it('is deprecated in favor of revoke_customer_invitation and remains destructive', () => {
    expect(revokeAgentInvitation.key).toBe('revoke_agent_invitation');
    expect(revokeCustomerInvitation.key).toBe('revoke_customer_invitation');
    expect(revokeAgentInvitation.description).toMatch(
      /^DEPRECATED — use `revoke_customer_invitation` instead\. /
    );
    expect(revokeAgentInvitation.tags).toMatchObject({
      destructive: true,
      deprecated: true
    });
    expect(revokeAgentInvitation.instructions).toContain(
      'Use `revoke_customer_invitation` for new calls. Keep `revoke_agent_invitation` only for compatibility with existing workflows.'
    );
  });

  it('accepts non-empty URI-encodable opaque adi_ IDs and rejects malformed values', () => {
    for (const validInvitationId of [
      'adi_550e8400e29b41d4a716446655440000',
      'adi_550E8400E29B41D4A716446655440000',
      'adi_short',
      'adi_東京',
      invitationId
    ]) {
      expect(
        revokeAgentInvitation.inputSchema.safeParse({
          id: validInvitationId,
          idempotencyKey,
          confirm: true
        }).success
      ).toBe(true);
    }

    for (const invalidInvitationId of [
      '',
      'adi_',
      'agt_550e8400e29b41d4a716446655440000',
      'ADI_550e8400e29b41d4a716446655440000',
      'adi_has space',
      'adi_line\nbreak',
      'adi_control\u0000value',
      'adi_malformed\uD800'
    ]) {
      expect(
        revokeAgentInvitation.inputSchema.safeParse({
          id: invalidInvitationId,
          idempotencyKey,
          confirm: true
        }).success
      ).toBe(false);
    }
  });

  it('requires explicit confirmation and an idempotency key before revoking', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');
    const context = {
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    };

    await expect(
      revokeAgentInvitation.handleInvocation({
        ...context,
        input: { id: invitationId, idempotencyKey, confirm: false }
      } as never)
    ).rejects.toThrow(/confirm/i);
    await expect(
      revokeAgentInvitation.handleInvocation({
        ...context,
        input: { id: invitationId, confirm: true }
      } as never)
    ).rejects.toThrow(/idempotencyKey/i);
    expect(request).not.toHaveBeenCalled();
  });

  it('encodes the opaque ID, sends a bodyless DELETE, and preserves the raw response', async () => {
    const meta = {
      deleted: 'true',
      requestId: 'req_550e8400e29b41d4a716446655440000',
      futureMetaField: 'preserved'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: invitation,
      meta,
      futureEnvelopeField: 'accepted'
    });

    const result = await revokeAgentInvitation.handleInvocation(invocationContext);

    expect(request).toHaveBeenCalledWith(
      'revoke agent invitation',
      'delete',
      `/agents/invitations/${encodeURIComponent(invitationId)}`,
      { idempotencyKey }
    );
    expect(revokeAgentInvitation.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      invitationId,
      type: 'agentDelegationInvitation',
      status: 'CANCELED',
      invitation,
      deleted: true,
      meta
    });
    expect(result.message).toBe(`Revoked agent invitation **${invitationId}**.`);
  });

  it('rejects a successful response for a different invitation ID', async () => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      ...minimalSuccessfulResponse,
      data: {
        ...minimalSuccessfulResponse.data,
        id: 'adi_different'
      }
    });

    const error = await revokeAgentInvitation
      .handleInvocation(invocationContext)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different agent invitation than the one requested/i);
    expect(error.message).toMatch(/verify invitation state.*before retrying/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });

  it.each([
    ['data', { meta: { deleted: true } }],
    [
      'resource type',
      {
        ...minimalSuccessfulResponse,
        data: { ...minimalSuccessfulResponse.data, type: 'invitation' }
      }
    ],
    [
      'resource ID',
      {
        ...minimalSuccessfulResponse,
        data: { ...minimalSuccessfulResponse.data, id: 'adi_' }
      }
    ],
    [
      'attributes',
      {
        ...minimalSuccessfulResponse,
        data: {
          type: 'agentDelegationInvitation',
          id: invitationId,
          relationships: minimalSuccessfulResponse.data.relationships
        }
      }
    ],
    [
      'status',
      {
        ...minimalSuccessfulResponse,
        data: { ...minimalSuccessfulResponse.data, attributes: { status: '   ' } }
      }
    ],
    [
      'relationships',
      {
        ...minimalSuccessfulResponse,
        data: {
          type: 'agentDelegationInvitation',
          id: invitationId,
          attributes: { status: 'CANCELED' }
        }
      }
    ],
    [
      'agent relationship',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...minimalSuccessfulResponse.data,
          relationships: { customerParty: { data: null } }
        }
      }
    ],
    [
      'agent resource type',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...minimalSuccessfulResponse.data,
          relationships: {
            ...minimalSuccessfulResponse.data.relationships,
            agent: { data: { type: 'customer', id: 'agt_opaque' } }
          }
        }
      }
    ],
    [
      'customer party relationship',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...minimalSuccessfulResponse.data,
          relationships: {
            agent: { data: { type: 'agent', id: 'agt_opaque' } }
          }
        }
      }
    ],
    ['meta', { data: minimalSuccessfulResponse.data }],
    [
      'boolean deletion confirmation',
      { ...minimalSuccessfulResponse, meta: { deleted: false } }
    ],
    [
      'string deletion confirmation',
      { ...minimalSuccessfulResponse, meta: { deleted: 'false' } }
    ]
  ])('rejects a malformed successful response with invalid %s', async (_field, response) => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

    const error = await revokeAgentInvitation
      .handleInvocation(invocationContext)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/malformed success response/i);
    expect(error.message).toMatch(/verify invitation state.*before retrying/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });
});
