import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { deleteAgent } from './agents';

const agentId = 'agt_550E8400/opaque?version=2#agent🚀';
const idempotencyKey = 'delete-agent-1';

const minimalSuccessfulResponse = {
  data: {
    type: 'agent',
    id: 'agt_opaque',
    attributes: {
      status: 'REVOKED'
    }
  },
  meta: { deleted: true }
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('delete_agent', () => {
  it('accepts non-empty URI-encodable opaque agt_ IDs and is marked destructive', () => {
    for (const validAgentId of [
      'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
      'agt_3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F',
      'agt_short',
      agentId,
      'agt_未来🚀'
    ]) {
      expect(
        deleteAgent.inputSchema.safeParse({
          agentId: validAgentId,
          idempotencyKey,
          confirm: true
        }).success
      ).toBe(true);
    }

    for (const invalidAgentId of [
      '',
      'agt_',
      'pty_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
      'AGT_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
      'agt_future\uD800',
      'agt_future\uDC00'
    ]) {
      expect(
        deleteAgent.inputSchema.safeParse({
          agentId: invalidAgentId,
          idempotencyKey,
          confirm: true
        }).success
      ).toBe(false);
    }

    expect(deleteAgent.tags).toMatchObject({ destructive: true });
    expect(deleteAgent.description).toContain('active customer authorizations');
    expect(deleteAgent.description).toContain('pending invitations');
  });

  it('requires explicit confirmation and an idempotency key before deleting', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');
    const context = {
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    };

    await expect(
      deleteAgent.handleInvocation({
        ...context,
        input: { agentId, idempotencyKey, confirm: false }
      } as never)
    ).rejects.toThrow(/confirm/i);
    await expect(
      deleteAgent.handleInvocation({
        ...context,
        input: { agentId, confirm: true }
      } as never)
    ).rejects.toThrow(/idempotencyKey/i);
    expect(request).not.toHaveBeenCalled();
  });

  it('deletes without a body, encodes the opaque ID, and preserves additive response fields', async () => {
    const agent = {
      type: 'agent',
      id: agentId,
      attributes: {
        name: 'Carrier Payment Agent v2.1',
        description: 'Autonomous agent that pays delivery carriers',
        handle: '@natural-carrier_payments',
        status: 'REVOKED',
        limits: {
          perTransaction: 100000
        },
        createdAt: '2026-01-04T15:30:00Z',
        createdBy: 'usr_550e8400e29b41d4a716446655440000',
        lastActiveAt: '2026-01-05T09:12:00Z',
        futureAttribute: 'preserved'
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
    const meta = {
      deleted: true,
      requestId: 'req_550e8400e29b41d4a716446655440000',
      futureMetaField: 'preserved'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: agent,
      meta,
      futureEnvelopeField: 'accepted'
    });

    const result = await deleteAgent.handleInvocation({
      input: { agentId, idempotencyKey, confirm: true },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'delete agent',
      'delete',
      `/agents/${encodeURIComponent(agentId)}`,
      { idempotencyKey }
    );
    expect(deleteAgent.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      agentId,
      type: 'agent',
      status: 'REVOKED',
      agent,
      deleted: true,
      meta
    });
    expect(result.message).toBe(`Deleted agent **${agentId}**.`);
  });

  it('rejects a successful response for a different agent ID', async () => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      ...minimalSuccessfulResponse,
      data: {
        ...minimalSuccessfulResponse.data,
        id: 'agt_different'
      }
    });

    const error = await deleteAgent
      .handleInvocation({
        input: { agentId: 'agt_requested', idempotencyKey, confirm: true },
        auth: { token: 'sk_ntl_test', keyType: 'party_key' },
        config: {}
      } as never)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different agent than the one requested/i);
    expect(error.message).toMatch(/verify agent state.*before retrying/i);
    expect(error.message).toMatch(/same idempotency key/i);
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
        data: { ...minimalSuccessfulResponse.data, id: 'agt_' }
      }
    ],
    [
      'attributes',
      {
        ...minimalSuccessfulResponse,
        data: {
          type: 'agent',
          id: 'agt_opaque'
        }
      }
    ],
    [
      'status',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...minimalSuccessfulResponse.data,
          attributes: {}
        }
      }
    ],
    ['meta', { data: minimalSuccessfulResponse.data }],
    ['deleted confirmation', { ...minimalSuccessfulResponse, meta: { deleted: false } }]
  ])('rejects a malformed successful response with invalid %s', async (_field, response) => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

    const error = await deleteAgent
      .handleInvocation({
        input: { agentId, idempotencyKey, confirm: true },
        auth: { token: 'sk_ntl_test', keyType: 'party_key' },
        config: {}
      } as never)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/malformed success response/i);
    expect(error.message).toMatch(/verify agent state.*before retrying/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });
});
