import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { getParty } from './admin';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('get_party', () => {
  it('is a bodyless read-only identity lookup with a specific public description', async () => {
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
        displayName: 'Natural',
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
      requestId: 'req_a1b2c3d4e5f6'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: party,
      meta
    });

    const result = await getParty.handleInvocation({
      input: {},
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(getParty.tags).toMatchObject({ readOnly: true });
    expect(getParty.description).toContain("authenticated caller's Natural party identity");
    expect(request).toHaveBeenCalledWith('get party', 'get', '/parties/me');
    expect(getParty.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      partyId,
      type: party.type,
      partyType: party.attributes.partyType,
      legalName: party.attributes.legalName,
      firstName: party.attributes.firstName,
      lastName: party.attributes.lastName,
      displayName: party.attributes.displayName,
      handle: party.attributes.handle,
      avatarUrl: party.attributes.avatarUrl,
      persona: party.attributes.persona,
      status: party.attributes.status,
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
  });

  it('aliases a legacy primaryEmail-only response while preserving nulls and raw data', async () => {
    const party = {
      id: 'pty_019cd1798d617f65a79cb965dda9eac3',
      type: 'party',
      attributes: {
        partyType: 'PERSON',
        legalName: null,
        firstName: 'Ada',
        lastName: 'Lovelace',
        status: 'ACTIVE',
        displayName: null,
        handle: null,
        avatarUrl: null,
        persona: null,
        primaryEmail: 'legacy@example.com',
        primaryPhone: null,
        addressLine1: null,
        addressCity: null,
        addressState: null,
        addressPostalCode: null,
        addressCountry: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        createdBy: null
      }
    };
    const meta = { requestId: 'req_legacy' };
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({ data: party, meta });

    const result = await getParty.handleInvocation({
      input: {},
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(result.output).toMatchObject({
      email: party.attributes.primaryEmail,
      primaryEmail: party.attributes.primaryEmail,
      legalName: null,
      displayName: null,
      primaryPhone: null,
      addressLine1: null,
      createdBy: null,
      attributes: party.attributes,
      meta,
      party
    });
  });

  it('preserves an explicit null email when aliasing primaryEmail', async () => {
    const party = {
      id: 'pty_019cd1798d617f65a79cb965dda9eac3',
      type: 'party',
      attributes: {
        email: null
      }
    };
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({ data: party });

    const result = await getParty.handleInvocation({
      input: {},
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(result.output).toMatchObject({
      email: null,
      primaryEmail: null,
      attributes: party.attributes,
      meta: {},
      party
    });
  });

  it('accepts a future-format nonempty opaque party ID', async () => {
    const party = {
      id: 'party:v2:opaque_01JQ9Z8Y7X6W5V4U3T2S1R0QPN',
      type: 'party',
      attributes: {
        status: 'ACTIVE'
      },
      futureResourceField: {
        preserved: true
      }
    };
    const meta = { requestId: 'req_future_format' };
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({ data: party, meta });

    const result = await getParty.handleInvocation({
      input: {},
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(getParty.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toMatchObject({
      partyId: party.id,
      type: 'party',
      status: 'ACTIVE',
      attributes: party.attributes,
      meta,
      party
    });
  });

  it.each([
    ['missing data', {}],
    ['missing id', { data: { type: 'party', attributes: {} } }],
    ['empty id', { data: { id: '', type: 'party', attributes: {} } }],
    [
      'wrong type',
      {
        data: {
          id: 'pty_019cd1798d617f65a79cb965dda9eac3',
          type: 'organization',
          attributes: {}
        }
      }
    ],
    [
      'missing attributes',
      { data: { id: 'pty_019cd1798d617f65a79cb965dda9eac3', type: 'party' } }
    ]
  ])('rejects a malformed success response with %s', async (_case, response) => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

    const invocation = getParty.handleInvocation({
      input: {},
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
