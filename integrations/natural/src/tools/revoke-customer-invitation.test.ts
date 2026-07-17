import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { revokeCustomerInvitation } from './customers';

const invitationId = 'adi_550E8400/opaque?customer=1';

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
    expiresAt: '2026-01-12T10:15:00.000Z',
    acceptedAt: null,
    declinedAt: null,
    cancelReason: 'DEVELOPER_REVOKED',
    tags: { campaign: 'q3_reactivation' },
    createdAt: '2026-01-05T10:15:00.000Z',
    updatedAt: '2026-01-05T10:20:00.000Z',
    futureInvitationField: 'preserved'
  },
  relationships: {
    agent: {
      data: {
        type: 'agent',
        id: 'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
        futureIdentifierField: 'preserved'
      },
      futureRelationshipField: 'preserved'
    },
    customerParty: { data: null },
    futureRelationshipsField: 'preserved'
  },
  futureResourceField: 'preserved'
};

const meta = {
  deleted: true,
  requestId: 'req_550e8400e29b41d4a716446655440000',
  futureMetaField: 'preserved'
};

const minimalSuccessfulResponse = {
  data: {
    type: 'agentDelegationInvitation',
    id: 'adi_opaque',
    attributes: { status: 'CANCELED' },
    relationships: {
      agent: { data: { type: 'agent', id: 'agt_opaque' } },
      customerParty: { data: null }
    }
  },
  meta: { deleted: true }
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('revoke_customer_invitation', () => {
  it('accepts non-empty opaque adi_ invitation IDs and is destructive', () => {
    for (const validInvitationId of [
      'adi_550e8400e29b41d4a716446655440000',
      'adi_550E8400E29B41D4A716446655440000',
      'adi_short',
      invitationId
    ]) {
      expect(
        revokeCustomerInvitation.inputSchema.safeParse({
          invitationId: validInvitationId,
          confirm: true
        }).success
      ).toBe(true);
    }

    for (const invalidInvitationId of [
      '',
      'adi_',
      'agt_550e8400e29b41d4a716446655440000',
      'ADI_550e8400e29b41d4a716446655440000'
    ]) {
      expect(
        revokeCustomerInvitation.inputSchema.safeParse({
          invitationId: invalidInvitationId,
          confirm: true
        }).success
      ).toBe(false);
    }

    expect(revokeCustomerInvitation.tags).toMatchObject({ destructive: true });
    expect(revokeCustomerInvitation.description).toContain('pending');
    expect(revokeCustomerInvitation.description).toContain('not documented as idempotent');
  });

  it('requires explicit confirmation before revoking', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');

    await expect(
      revokeCustomerInvitation.handleInvocation({
        input: { invitationId, confirm: false },
        auth: { token: 'sk_ntl_test', keyType: 'party_key' },
        config: {}
      } as never)
    ).rejects.toThrow(/confirm/i);
    expect(request).not.toHaveBeenCalled();
  });

  it('sends a bodyless DELETE without idempotency, safely encodes the opaque ID, and preserves raw additive response fields', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: invitation,
      meta,
      futureEnvelopeField: 'accepted'
    });

    const result = await revokeCustomerInvitation.handleInvocation({
      input: { invitationId, confirm: true },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'revoke customer invitation',
      'delete',
      `/customers/invitations/${encodeURIComponent(invitationId)}`
    );
    expect(revokeCustomerInvitation.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      invitationId,
      type: 'agentDelegationInvitation',
      status: 'CANCELED',
      invitation,
      deleted: true,
      meta
    });
    expect(result.message).toBe(`Revoked customer invitation **${invitationId}**.`);
  });

  it('rejects a successful response for a different invitation ID', async () => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      ...minimalSuccessfulResponse,
      data: {
        ...minimalSuccessfulResponse.data,
        id: 'adi_different'
      }
    });

    const error = await revokeCustomerInvitation
      .handleInvocation({
        input: { invitationId: 'adi_requested', confirm: true },
        auth: { token: 'sk_ntl_test', keyType: 'party_key' },
        config: {}
      } as never)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different customer invitation than the one requested/i);
    expect(error.message).toMatch(/verify invitation state.*before retrying/i);
    expect(error.message).toMatch(/non-idempotent request/i);
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
      'status',
      {
        ...minimalSuccessfulResponse,
        data: { ...minimalSuccessfulResponse.data, attributes: {} }
      }
    ],
    [
      'relationships',
      {
        ...minimalSuccessfulResponse,
        data: {
          type: 'agentDelegationInvitation',
          id: 'adi_opaque',
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
    ['deleted confirmation', { ...minimalSuccessfulResponse, meta: { deleted: false } }]
  ])('rejects a malformed successful response with invalid %s', async (_field, response) => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

    const error = await revokeCustomerInvitation
      .handleInvocation({
        input: { invitationId, confirm: true },
        auth: { token: 'sk_ntl_test', keyType: 'party_key' },
        config: {}
      } as never)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/malformed success response/i);
    expect(error.message).toMatch(/verify invitation state.*before retrying/i);
    expect(error.message).toMatch(/non-idempotent request/i);
  });
});
