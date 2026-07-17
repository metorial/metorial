import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { removePartyMember } from './admin';

const userId = 'usr_019CD179/opaque?version=2#member🚀';
const idempotencyKey = 'remove-party-member-1';

const validInput = {
  userId,
  idempotencyKey,
  confirm: true
};

const minimalSuccessfulResponse = {
  data: {
    type: 'user',
    id: userId
  },
  meta: { deleted: true }
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('remove_party_member', () => {
  it('accepts non-empty URI-encodable opaque usr_ IDs and is marked destructive', () => {
    for (const validUserId of [
      'usr_019cd1798d657de5b5fed4198cb9fac0',
      'usr_019CD1798D657DE5B5FED4198CB9FAC0',
      'usr_short',
      userId,
      'usr_未来🚀'
    ]) {
      expect(
        removePartyMember.inputSchema.safeParse({
          ...validInput,
          userId: validUserId
        }).success
      ).toBe(true);
    }

    for (const invalidUserId of [
      '',
      'usr_',
      'pty_019cd1798d657de5b5fed4198cb9fac0',
      'USR_019cd1798d657de5b5fed4198cb9fac0',
      'usr_future\uD800',
      'usr_future\uDC00'
    ]) {
      expect(
        removePartyMember.inputSchema.safeParse({
          ...validInput,
          userId: invalidUserId
        }).success
      ).toBe(false);
    }

    expect(removePartyMember.tags).toMatchObject({ destructive: true });
    expect(removePartyMember.description).toContain('confirmation');
    expect(removePartyMember.description).toContain('idempotency key');
  });

  it('requires explicit confirmation and an idempotency key before removing', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');
    const context = {
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    };

    await expect(
      removePartyMember.handleInvocation({
        ...context,
        input: { ...validInput, confirm: false }
      } as never)
    ).rejects.toThrow(/confirm/i);
    await expect(
      removePartyMember.handleInvocation({
        ...context,
        input: { ...validInput, idempotencyKey: undefined }
      } as never)
    ).rejects.toThrow(/idempotencyKey/i);
    expect(request).not.toHaveBeenCalled();
  });

  it('requires the removed user ID, type, raw resource, deletion flag, and metadata in output', () => {
    const output = {
      userId,
      type: 'user' as const,
      user: minimalSuccessfulResponse.data,
      deleted: true as const,
      meta: minimalSuccessfulResponse.meta
    };

    expect(removePartyMember.outputSchema.safeParse(output).success).toBe(true);
    for (const field of ['userId', 'type', 'user', 'deleted', 'meta'] as const) {
      const incompleteOutput = Object.fromEntries(
        Object.entries(output).filter(([name]) => name !== field)
      );
      expect(removePartyMember.outputSchema.safeParse(incompleteOutput).success, field).toBe(
        false
      );
    }
  });

  it('deletes without a body, encodes the opaque ID, and preserves additive response fields', async () => {
    const user = {
      type: 'user',
      id: userId,
      futureResourceField: 'preserved'
    };
    const meta = {
      deleted: true,
      requestId: 'req_123',
      futureMetaField: 'preserved'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: user,
      meta
    });

    const result = await removePartyMember.handleInvocation({
      input: validInput,
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'remove party member',
      'delete',
      `/parties/me/members/${encodeURIComponent(userId)}`,
      { idempotencyKey }
    );
    expect(removePartyMember.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      userId,
      type: 'user',
      user,
      deleted: true,
      meta
    });
    expect(result.message).toBe(`Removed party member **${userId}**.`);
  });

  it.each([
    ['data', { meta: { deleted: true } }],
    [
      'resource type',
      {
        ...minimalSuccessfulResponse,
        data: { ...minimalSuccessfulResponse.data, type: 'party' }
      }
    ],
    [
      'resource ID',
      {
        ...minimalSuccessfulResponse,
        data: { ...minimalSuccessfulResponse.data, id: 'usr_' }
      }
    ],
    ['meta', { data: minimalSuccessfulResponse.data }],
    ['deleted confirmation', { ...minimalSuccessfulResponse, meta: { deleted: false } }]
  ])('rejects a malformed successful response with invalid %s', async (_field, response) => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

    const error = await removePartyMember
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
    expect(error.message).toMatch(/verify party membership state.*before retrying/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });

  it('rejects a successful response for a different user ID', async () => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      ...minimalSuccessfulResponse,
      data: {
        ...minimalSuccessfulResponse.data,
        id: 'usr_different'
      }
    });

    const error = await removePartyMember
      .handleInvocation({
        input: validInput,
        auth: { token: 'sk_ntl_test', keyType: 'party_key' },
        config: {}
      } as never)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different party member than the one requested/i);
    expect(error.message).toMatch(/verify party membership state.*before retrying/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });
});
