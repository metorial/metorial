import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { listAgentCustomers } from './agents';
import { listCustomers } from './customers';

const agentId = 'legacy-agent-reference';
const customerId = 'pty_future_opaque_value';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('list_agent_customers', () => {
  it('is deprecated in favor of list_customers', () => {
    expect(listAgentCustomers.key).toBe('list_agent_customers');
    expect(listCustomers.key).toBe('list_customers');
    expect(listAgentCustomers.tags).toMatchObject({ readOnly: true, deprecated: true });
    expect(listAgentCustomers.description).toMatch(
      /^DEPRECATED — use `list_customers` instead\./
    );
    expect(listAgentCustomers.instructions).toContain(
      'Use `list_customers` for new calls. Keep `list_agent_customers` only for compatibility with existing workflows.'
    );
  });

  it('preserves the legacy opaque agent ID contract', () => {
    expect(listAgentCustomers.inputSchema.safeParse({ agentId }).success).toBe(true);
    expect(
      listAgentCustomers.inputSchema.safeParse({ agentId: 'agt_future_format' }).success
    ).toBe(true);
    expect(listAgentCustomers.inputSchema.safeParse({ agentId: '' }).success).toBe(false);
  });

  it('preserves raw records and query pagination without classifying customer IDs', async () => {
    const customer = {
      id: customerId,
      type: 'customer',
      attributes: {
        name: 'Acme Co',
        email: 'ops@acme.com',
        status: 'ACTIVE',
        permissions: ['payments.read', 'wallets.read'],
        limits: { perTransaction: 100000 },
        createdAt: '2026-01-10T12:00:00.000Z',
        updatedAt: '2026-02-10T12:00:00.000Z',
        futureAttribute: 'preserved'
      },
      relationships: {
        agent: {
          data: {
            id: agentId,
            type: 'agent',
            attributes: { name: 'Invoice Agent' }
          }
        }
      },
      futureResourceField: 'preserved'
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: [customer],
      meta: {
        pagination: {
          hasMore: true,
          nextCursor: 'next-cursor'
        }
      }
    });

    const result = await listAgentCustomers.handleInvocation({
      input: { agentId, limit: 25, cursor: 'cursor-1' },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'list agent customers',
      'get',
      `/agents/${agentId}/customers`,
      {
        params: {
          limit: 25,
          cursor: 'cursor-1'
        }
      }
    );
    expect(listAgentCustomers.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      customers: [customer],
      pagination: {
        hasMore: true,
        nextCursor: 'next-cursor'
      }
    });
  });
});
