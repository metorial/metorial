import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { getAgent } from './agents';

const agentId = 'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('get_agent', () => {
  it('accepts only documented Natural agent IDs', () => {
    expect(getAgent.inputSchema.safeParse({ agentId }).success).toBe(true);
    expect(
      getAgent.inputSchema.safeParse({
        agentId: 'agt_3C4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f'
      }).success
    ).toBe(false);
    expect(
      getAgent.inputSchema.safeParse({
        agentId: 'pty_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f'
      }).success
    ).toBe(false);
    expect(getAgent.inputSchema.safeParse({ agentId: 'agt_invalid' }).success).toBe(false);
  });

  it('gets the agent without a body and exposes stable owner metadata plus the raw record', async () => {
    const agent = {
      type: 'agent',
      id: agentId,
      attributes: {
        name: 'Carrier Payment Agent v2.1',
        description: 'Autonomous agent that pays delivery carriers',
        handle: '@natural-carrier_payments',
        status: 'ACTIVE',
        limits: {
          perTransaction: 100000,
          perDay: null,
          perMonth: 1000000
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
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: agent
    });

    const result = await getAgent.handleInvocation({
      input: { agentId },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith('get agent', 'get', `/agents/${agentId}`);
    expect(getAgent.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      agentId,
      type: agent.type,
      name: agent.attributes.name,
      description: agent.attributes.description,
      handle: agent.attributes.handle,
      status: agent.attributes.status,
      limits: agent.attributes.limits,
      createdAt: agent.attributes.createdAt,
      createdBy: agent.attributes.createdBy,
      lastActiveAt: agent.attributes.lastActiveAt,
      partyId: agent.relationships.party.data.id,
      agent
    });
  });
});
