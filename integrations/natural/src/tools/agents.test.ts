import { beforeEach, describe, expect, it, vi } from 'vitest';

const naturalClientMocks = vi.hoisted(() => ({
  request: vi.fn()
}));

const NaturalClientMock = vi.hoisted(() => vi.fn(() => naturalClientMocks));

vi.mock('../lib/client', () => ({
  NaturalClient: NaturalClientMock
}));

import { createAgent } from './agents';

const createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'sk_ntl_test', keyType: 'party_key' },
    config: {}
  }) as any;

describe('Natural create agent tool', () => {
  beforeEach(() => {
    naturalClientMocks.request.mockReset();
    NaturalClientMock.mockClear();
  });

  it('sends documented attributes and exposes stable created-agent metadata', async () => {
    const agent = {
      type: 'agent',
      id: 'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
      attributes: {
        name: 'Carrier Payment Agent v2.1',
        description: 'Autonomous agent that pays delivery carriers',
        handle: '@natural-carrier_payments',
        status: 'ACTIVE',
        limits: {
          perTransaction: 100000,
          perDay: null
        },
        createdAt: '2026-01-04T15:30:00Z',
        createdBy: 'usr_550e8400e29b41d4a716446655440000',
        lastActiveAt: null
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

    const result = await createAgent.handleInvocation(
      createCtx({
        name: 'Carrier Payment Agent v2.1',
        description: 'Autonomous agent that pays delivery carriers',
        limits: {
          perTransaction: 100000,
          perDay: null
        },
        walletId: 'wal_550e8400e29b41d4a716446655440000',
        idempotencyKey: 'create-agent-1'
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'create agent',
      'post',
      '/agents',
      {
        idempotencyKey: 'create-agent-1',
        body: {
          data: {
            attributes: {
              name: 'Carrier Payment Agent v2.1',
              description: 'Autonomous agent that pays delivery carriers',
              limits: {
                perTransaction: 100000,
                perDay: null
              },
              walletId: 'wal_550e8400e29b41d4a716446655440000'
            }
          }
        }
      }
    );
    expect(result.output).toEqual({
      agentId: 'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
      type: 'agent',
      name: 'Carrier Payment Agent v2.1',
      description: 'Autonomous agent that pays delivery carriers',
      handle: '@natural-carrier_payments',
      status: 'ACTIVE',
      limits: {
        perTransaction: 100000,
        perDay: null
      },
      createdAt: '2026-01-04T15:30:00Z',
      createdBy: 'usr_550e8400e29b41d4a716446655440000',
      lastActiveAt: null,
      partyId: 'pty_7c9e6679e29b41d4a716446655440001',
      agent
    });
  });

  it('enforces current create-agent string and identifier constraints', () => {
    const valid = {
      name: 'Agent',
      description: 'A'.repeat(100),
      walletId: 'wal_550e8400e29b41d4a716446655440000',
      idempotencyKey: 'create-agent-1'
    };

    expect(createAgent.inputSchema.safeParse(valid).success).toBe(true);
    expect(createAgent.inputSchema.parse({ ...valid, slug: 'agent_1' })).not.toHaveProperty(
      'slug'
    );
    expect(
      createAgent.inputSchema.safeParse({ ...valid, description: 'A'.repeat(101) }).success
    ).toBe(false);
    expect(
      createAgent.inputSchema.safeParse({ ...valid, walletId: 'wal_invalid' }).success
    ).toBe(false);
  });
});
