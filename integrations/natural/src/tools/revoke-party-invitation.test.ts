import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { revokePartyInvitation } from './admin';

const invitationId = 'inv_550E8400/opaque?party=1#invite🚀';
const idempotencyKey = 'revoke-party-invitation-1';

const invitation = {
  type: 'invitation',
  id: invitationId,
  attributes: {
    email: 'engineer@velocitylogistics.com',
    role: 'MEMBER',
    status: 'REVOKED',
    expiresAt: '2026-01-11T15:30:00Z',
    createdAt: '2026-01-04T15:30:00Z',
    acceptedAt: null,
    futureInvitationField: 'preserved'
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
    type: 'invitation',
    id: 'inv_opaque',
    attributes: {
      email: 'engineer@velocitylogistics.com',
      role: 'MEMBER',
      status: 'REVOKED',
      expiresAt: '2026-01-11T15:30:00Z',
      createdAt: '2026-01-04T15:30:00Z',
      acceptedAt: null
    }
  },
  meta: { deleted: true }
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('revoke_party_invitation', () => {
  it('accepts non-empty URI-encodable opaque inv_ invitation IDs and is destructive', () => {
    for (const validInvitationId of [
      'inv_019cd4a832f37c4b8a1d63e94b7c8d12',
      'inv_019CD4A832F37C4B8A1D63E94B7C8D12',
      'inv_short',
      invitationId,
      'inv_未来🚀'
    ]) {
      expect(
        revokePartyInvitation.inputSchema.safeParse({
          invitationId: validInvitationId,
          idempotencyKey,
          confirm: true
        }).success
      ).toBe(true);
    }

    for (const invalidInvitationId of [
      '',
      'inv_',
      'adi_019cd4a832f37c4b8a1d63e94b7c8d12',
      'INV_019cd4a832f37c4b8a1d63e94b7c8d12',
      'inv_future\uD800',
      'inv_future\uDC00'
    ]) {
      expect(
        revokePartyInvitation.inputSchema.safeParse({
          invitationId: invalidInvitationId,
          idempotencyKey,
          confirm: true
        }).success
      ).toBe(false);
    }

    expect(revokePartyInvitation.tags).toMatchObject({ destructive: true });
    expect(revokePartyInvitation.description).toContain('pending');
    expect(revokePartyInvitation.description).toContain('idempotency key');
  });

  it('requires explicit confirmation and an idempotency key before revoking', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');
    const context = {
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    };

    await expect(
      revokePartyInvitation.handleInvocation({
        ...context,
        input: { invitationId, idempotencyKey, confirm: false }
      } as never)
    ).rejects.toThrow(/confirm/i);
    await expect(
      revokePartyInvitation.handleInvocation({
        ...context,
        input: { invitationId, idempotencyKey: undefined, confirm: true }
      } as never)
    ).rejects.toThrow(/idempotencyKey/);
    expect(request).not.toHaveBeenCalled();
  });

  it('deletes without a body, encodes the opaque ID, and preserves additive response fields', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: invitation,
      meta,
      futureEnvelopeField: 'accepted'
    });

    const result = await revokePartyInvitation.handleInvocation({
      input: { invitationId, idempotencyKey, confirm: true },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'revoke party invitation',
      'delete',
      `/party-invitations/${encodeURIComponent(invitationId)}`,
      { idempotencyKey }
    );
    expect(revokePartyInvitation.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      invitationId,
      type: 'invitation',
      status: 'REVOKED',
      invitation,
      deleted: true,
      meta
    });
    expect(result.message).toBe(`Revoked party invitation **${invitationId}**.`);
  });

  it('rejects a successful response for a different invitation ID', async () => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      ...minimalSuccessfulResponse,
      data: {
        ...minimalSuccessfulResponse.data,
        id: 'inv_different'
      }
    });

    const error = await revokePartyInvitation
      .handleInvocation({
        input: { invitationId: 'inv_requested', idempotencyKey, confirm: true },
        auth: { token: 'sk_ntl_test', keyType: 'party_key' },
        config: {}
      } as never)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different party invitation than the one requested/i);
    expect(error.message).toMatch(/verify invitation state.*before retrying/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });

  it.each([
    ['data', { meta: { deleted: true } }],
    [
      'resource type',
      {
        ...minimalSuccessfulResponse,
        data: { ...minimalSuccessfulResponse.data, type: 'partyInvitation' }
      }
    ],
    [
      'resource ID',
      {
        ...minimalSuccessfulResponse,
        data: { ...minimalSuccessfulResponse.data, id: 'inv_' }
      }
    ],
    [
      'attributes',
      {
        ...minimalSuccessfulResponse,
        data: {
          type: 'invitation',
          id: 'inv_opaque'
        }
      }
    ],
    [
      'email',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...minimalSuccessfulResponse.data,
          attributes: { ...minimalSuccessfulResponse.data.attributes, email: undefined }
        }
      }
    ],
    [
      'role',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...minimalSuccessfulResponse.data,
          attributes: { ...minimalSuccessfulResponse.data.attributes, role: undefined }
        }
      }
    ],
    [
      'status',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...minimalSuccessfulResponse.data,
          attributes: { ...minimalSuccessfulResponse.data.attributes, status: undefined }
        }
      }
    ],
    [
      'non-revoked status',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...minimalSuccessfulResponse.data,
          attributes: { ...minimalSuccessfulResponse.data.attributes, status: 'PENDING' }
        }
      }
    ],
    [
      'expiresAt',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...minimalSuccessfulResponse.data,
          attributes: { ...minimalSuccessfulResponse.data.attributes, expiresAt: undefined }
        }
      }
    ],
    [
      'createdAt',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...minimalSuccessfulResponse.data,
          attributes: { ...minimalSuccessfulResponse.data.attributes, createdAt: undefined }
        }
      }
    ],
    [
      'acceptedAt',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...minimalSuccessfulResponse.data,
          attributes: { ...minimalSuccessfulResponse.data.attributes, acceptedAt: undefined }
        }
      }
    ],
    ['meta', { data: minimalSuccessfulResponse.data }],
    ['deleted confirmation', { ...minimalSuccessfulResponse, meta: { deleted: false } }]
  ])('rejects a malformed successful response with invalid %s', async (_field, response) => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

    const error = await revokePartyInvitation
      .handleInvocation({
        input: { invitationId, idempotencyKey, confirm: true },
        auth: { token: 'sk_ntl_test', keyType: 'party_key' },
        config: {}
      } as never)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/malformed success response/i);
    expect(error.message).toMatch(/verify invitation state.*before retrying/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });
});
