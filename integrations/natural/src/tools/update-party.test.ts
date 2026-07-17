import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { updateParty } from './admin';

afterEach(() => {
  vi.restoreAllMocks();
});

const updateCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'sk_ntl_test', keyType: 'party_key' },
    config: {}
  }) as never;

describe('update_party', () => {
  it('accepts only a nonempty display name or null and rejects an empty update', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');

    expect(updateParty.inputSchema.safeParse({ displayName: 'Natural' }).success).toBe(true);
    expect(updateParty.inputSchema.safeParse({ displayName: null }).success).toBe(true);
    expect(updateParty.inputSchema.safeParse({ displayName: '' }).success).toBe(false);

    await expect(updateParty.handleInvocation(updateCtx({}))).rejects.toThrow(
      /at least one party update field/i
    );
    expect(request).not.toHaveBeenCalled();
  });

  it('patches the documented JSON:API attribute and exposes the complete updated party', async () => {
    const partyId = 'pty_019cd1798d617f65a79cb965dda9eac3';
    const party = {
      id: partyId,
      type: 'party',
      attributes: {
        partyType: 'ORG',
        legalName: 'Natural AI, Inc',
        firstName: null,
        lastName: null,
        status: 'ACTIVE',
        displayName: null,
        handle: '@natural',
        avatarUrl: 'https://assets.example.com/natural.webp',
        persona: 'DEVELOPER',
        email: 'contact@natural.com',
        primaryPhone: '+1-555-555-0100',
        addressLine1: '123 Main Street',
        addressCity: 'San Francisco',
        addressState: 'CA',
        addressPostalCode: '94105',
        addressCountry: 'US',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        createdBy: null,
        futurePartyField: 'preserved'
      },
      relationships: {
        owner: {
          data: {
            type: 'user',
            id: 'usr_550e8400e29b41d4a716446655440000'
          }
        }
      }
    };
    const meta = {
      requestId: 'req_a1b2c3d4e5f6',
      futureMetaField: 'preserved'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: party,
      meta
    });

    const result = await updateParty.handleInvocation(updateCtx({ displayName: null }));

    expect(updateParty.tags).toBeUndefined();
    expect(updateParty.description).toContain('clear it with null');
    expect(request).toHaveBeenCalledWith('update party', 'patch', '/parties/me', {
      body: {
        data: {
          attributes: {
            displayName: null
          }
        }
      }
    });
    expect(updateParty.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      partyId,
      type: party.type,
      status: party.attributes.status,
      partyType: party.attributes.partyType,
      legalName: party.attributes.legalName,
      firstName: party.attributes.firstName,
      lastName: party.attributes.lastName,
      displayName: party.attributes.displayName,
      handle: party.attributes.handle,
      avatarUrl: party.attributes.avatarUrl,
      persona: party.attributes.persona,
      email: party.attributes.email,
      primaryEmail: party.attributes.email,
      primaryPhone: party.attributes.primaryPhone,
      addressLine1: party.attributes.addressLine1,
      addressCity: party.attributes.addressCity,
      addressState: party.attributes.addressState,
      addressPostalCode: party.attributes.addressPostalCode,
      addressCountry: party.attributes.addressCountry,
      createdAt: party.attributes.createdAt,
      updatedAt: party.attributes.updatedAt,
      createdBy: party.attributes.createdBy,
      attributes: party.attributes,
      relationships: party.relationships,
      meta,
      party
    });
    expect(result.message).toBe('Updated Natural party profile.');
  });

  it.each([
    ['missing data', {}],
    [
      'wrong resource type',
      {
        data: {
          id: 'pty_019cd1798d617f65a79cb965dda9eac3',
          type: 'customer',
          attributes: {}
        }
      }
    ],
    ['empty resource ID', { data: { id: '', type: 'party', attributes: {} } }],
    [
      'missing attributes',
      { data: { id: 'pty_019cd1798d617f65a79cb965dda9eac3', type: 'party' } }
    ]
  ])('rejects a malformed PATCH success response with %s', async (_case, response) => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

    const error = await updateParty
      .handleInvocation(updateCtx({ displayName: 'Updated party' }))
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/malformed success response/i);
    expect(error.message).toMatch(/verify the party profile state.*before retrying/i);
    expect(error.message).toMatch(/non-idempotent request/i);
  });
});
