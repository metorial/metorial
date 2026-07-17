import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { createPartyInvitations } from './admin';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('create_party_invitations', () => {
  const invitations = [
    { email: 'engineer@example.com', role: 'MEMBER' as const },
    { email: 'finance@example.com', role: 'ADMIN' as const }
  ];

  it('enforces the documented email, role, and batch-size constraints', () => {
    expect(createPartyInvitations.inputSchema.safeParse({ invitations }).success).toBe(true);
    expect(createPartyInvitations.inputSchema.safeParse({ invitations: [] }).success).toBe(
      false
    );
    expect(
      createPartyInvitations.inputSchema.safeParse({
        invitations: Array.from({ length: 101 }, (_, index) => ({
          email: `member-${index}@example.com`,
          role: 'VIEWER'
        }))
      }).success
    ).toBe(false);
    expect(
      createPartyInvitations.inputSchema.safeParse({
        invitations: [{ email: 'not-an-email', role: 'MEMBER' }]
      }).success
    ).toBe(false);
    expect(
      createPartyInvitations.inputSchema.safeParse({
        invitations: [{ email: 'owner@example.com', role: 'OWNER' }]
      }).success
    ).toBe(false);
  });

  it('posts only the documented attributes without idempotency, expiry, or tags and preserves response metadata', async () => {
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
            id: 'pty_7c9e6679e29b41d4a716446655440001'
          }
        }
      },
      futureResourceField: 'preserved'
    };
    const failedInvitation = {
      email: 'finance@example.com',
      error: 'User is already a member of this party',
      futureFailureField: 'preserved'
    };
    const meta = {
      failed: [failedInvitation],
      requestId: 'req_123',
      futureMetaField: 'preserved'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: [invitation],
      meta
    });

    const result = await createPartyInvitations.handleInvocation({
      input: {
        invitations,
        expiresInDays: 30,
        tags: { campaign: 'q3' }
      },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'create party invitations',
      'post',
      '/party-invitations',
      {
        body: {
          data: {
            attributes: {
              invitations
            }
          }
        }
      }
    );
    expect(createPartyInvitations.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      invitationIds: [invitationId],
      invitations: [
        {
          invitationId,
          type: 'invitation',
          status: 'PENDING',
          recipient: {
            email: 'engineer@example.com'
          },
          role: 'MEMBER',
          expiresAt: '2026-01-11T15:30:00Z',
          createdAt: '2026-01-04T15:30:00Z',
          acceptedAt: null,
          relationships: invitation.relationships,
          invitation
        }
      ],
      failed: [failedInvitation],
      meta
    });
    expect(result.message).toBe('Created **1** party invitations; **1** failed.');
  });

  it.each([
    ['data', { meta: { failed: [] } }],
    ['data array', { data: {}, meta: { failed: [] } }],
    [
      'invitation type',
      {
        data: [
          {
            type: 'partyInvitation',
            id: 'inv_019cd4a832f37c4b8a1d63e94b7c8d12',
            attributes: {}
          }
        ],
        meta: { failed: [] }
      }
    ],
    [
      'invitation id',
      {
        data: [{ type: 'invitation', id: 'inv_invalid', attributes: {} }],
        meta: { failed: [] }
      }
    ],
    [
      'invitation attributes',
      {
        data: [
          {
            type: 'invitation',
            id: 'inv_019cd4a832f37c4b8a1d63e94b7c8d12'
          }
        ],
        meta: { failed: [] }
      }
    ],
    ['meta', { data: [] }],
    ['failed', { data: [], meta: {} }],
    ['failed array', { data: [], meta: { failed: {} } }],
    ['failure email', { data: [], meta: { failed: [{ error: 'Already a member' }] } }],
    [
      'failure error',
      { data: [], meta: { failed: [{ email: 'member@example.com', error: 409 }] } }
    ]
  ])('rejects a malformed successful response with invalid %s', async (_field, response) => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

    const error = await createPartyInvitations
      .handleInvocation({
        input: { invitations },
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
