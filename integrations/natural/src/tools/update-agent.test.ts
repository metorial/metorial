import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const naturalClientMocks = vi.hoisted(() => ({
  request: vi.fn()
}));

const NaturalClientMock = vi.hoisted(() => vi.fn(() => naturalClientMocks));

vi.mock('../lib/client', () => ({
  NaturalClient: NaturalClientMock
}));

import { updateAgent } from './agents';

const agentId = 'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f';

const updateCtx = (
  input: Record<string, unknown>,
  keyType: 'party_key' | 'agent_key' = 'party_key'
) =>
  ({
    input,
    auth: { token: 'sk_ntl_test', keyType },
    config: {}
  }) as any;

describe('Natural update agent tool', () => {
  beforeEach(() => {
    naturalClientMocks.request.mockReset();
    NaturalClientMock.mockClear();
  });

  it('validates documented IDs, mutable strings, slugs, and limits', () => {
    const valid = {
      agentId,
      name: null,
      description: 'A'.repeat(100),
      slug: 'carrier.payments_2',
      limits: {
        perTransaction: 100000,
        perDay: null
      },
      idempotencyKey: 'update-agent-1'
    };

    expect(updateAgent.inputSchema.safeParse(valid).success).toBe(true);
    expect(updateAgent.inputSchema.safeParse({ ...valid, slug: null }).success).toBe(true);
    expect(updateAgent.inputSchema.safeParse({ ...valid, limits: null }).success).toBe(true);
    expect(
      updateAgent.inputSchema.safeParse({ ...valid, agentId: 'agt_invalid' }).success
    ).toBe(false);
    expect(
      updateAgent.inputSchema.safeParse({ ...valid, description: 'A'.repeat(101) }).success
    ).toBe(false);
    expect(updateAgent.inputSchema.safeParse({ ...valid, slug: 'Carrier' }).success).toBe(
      false
    );
    expect(
      updateAgent.inputSchema.safeParse({
        ...valid,
        limits: { perTransaction: 0 }
      }).success
    ).toBe(false);
  });

  it('requires at least one mutable field before sending the update', async () => {
    await expect(
      updateAgent.handleInvocation(
        updateCtx({
          agentId,
          name: 'Carrier Payment Agent v3.0'
        })
      )
    ).rejects.toThrow(/idempotencyKey/i);

    await expect(
      updateAgent.handleInvocation(
        updateCtx({
          agentId,
          idempotencyKey: 'update-agent-empty'
        })
      )
    ).rejects.toThrow(/at least one agent update field/i);

    expect(naturalClientMocks.request).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    { perDay: 100000 }
  ])('rejects limits %j for agent credentials before creating a client', async limits => {
    const invocation = updateAgent.handleInvocation(
      updateCtx(
        {
          agentId,
          limits,
          idempotencyKey: 'update-agent-limits'
        },
        'agent_key'
      )
    );

    await expect(invocation).rejects.toBeInstanceOf(ServiceError);
    await expect(invocation).rejects.toThrow(/agent credentials cannot change limits/i);
    expect(NaturalClientMock).not.toHaveBeenCalled();
    expect(naturalClientMocks.request).not.toHaveBeenCalled();
  });

  it('patches documented JSON:API attributes and exposes stable metadata plus the raw record', async () => {
    const agent = {
      type: 'agent',
      id: agentId,
      attributes: {
        name: 'Carrier Payment Agent v3.0',
        description: null,
        handle: '@natural-carrier.payments_2',
        status: 'ACTIVE',
        limits: {
          perTransaction: 150000,
          perDay: null,
          perMonth: null
        },
        createdAt: '2026-01-04T15:30:00Z',
        createdBy: 'usr_550e8400e29b41d4a716446655440000',
        lastActiveAt: '2026-01-05T09:12:00Z',
        futureAgentField: 'preserved'
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: 'pty_7c9e6679e29b41d4a716446655440001'
          }
        }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: agent });

    const result = await updateAgent.handleInvocation(
      updateCtx({
        agentId,
        name: 'Carrier Payment Agent v3.0',
        description: null,
        slug: 'carrier.payments_2',
        limits: { perTransaction: 150000 },
        idempotencyKey: 'update-agent-1'
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'update agent',
      'patch',
      `/agents/${agentId}`,
      {
        idempotencyKey: 'update-agent-1',
        body: {
          data: {
            attributes: {
              name: 'Carrier Payment Agent v3.0',
              description: null,
              slug: 'carrier.payments_2',
              limits: { perTransaction: 150000 }
            }
          }
        }
      }
    );
    expect(updateAgent.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      agentId,
      type: 'agent',
      name: 'Carrier Payment Agent v3.0',
      description: null,
      handle: '@natural-carrier.payments_2',
      status: 'ACTIVE',
      limits: {
        perTransaction: 150000,
        perDay: null,
        perMonth: null
      },
      createdAt: '2026-01-04T15:30:00Z',
      createdBy: 'usr_550e8400e29b41d4a716446655440000',
      lastActiveAt: '2026-01-05T09:12:00Z',
      partyId: 'pty_7c9e6679e29b41d4a716446655440001',
      agent
    });
  });
});
