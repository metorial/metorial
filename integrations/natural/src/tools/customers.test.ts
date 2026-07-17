import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { getCustomer } from './customers';

const customerId = 'pty_4a8c9823f39c42a5b817556766551112';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('get_customer', () => {
  it('accepts only documented Natural customer party IDs', () => {
    expect(getCustomer.inputSchema.safeParse({ customerId }).success).toBe(true);
    expect(
      getCustomer.inputSchema.safeParse({
        customerId: 'dlg_550e8400e29b41d4a716446655440000'
      }).success
    ).toBe(false);
    expect(getCustomer.inputSchema.safeParse({ customerId: 'pty_invalid' }).success).toBe(
      false
    );
  });

  it('gets the customer without a body and exposes delegation metadata plus the raw record', async () => {
    const customer = {
      id: customerId,
      type: 'customer',
      attributes: {
        name: 'Acme Co',
        email: 'ops@acme.com',
        avatarUrl: 'https://static.natural.com/avatars/acme-co.png',
        createdAt: '2026-01-04T15:30:00.000Z',
        delegation: {
          id: 'dlg_550e8400e29b41d4a716446655440000',
          status: 'ACTIVE',
          permissions: ['payments.read'],
          createdAt: '2026-01-10T12:00:00.000Z'
        },
        agents: [
          {
            id: 'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
            name: 'Invoice Agent',
            status: 'ACTIVE',
            permissions: ['payments.read'],
            limits: { perTransaction: 100000 },
            futureAgentField: 'preserved'
          }
        ],
        futureCustomerField: 'preserved'
      },
      relationships: {
        developerParty: {
          data: {
            type: 'party',
            id: 'pty_7c9e6679e29b41d4a716446655440001'
          }
        }
      }
    };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: customer
    });

    const result = await getCustomer.handleInvocation({
      input: { customerId },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith('get customer', 'get', `/customers/${customerId}`);
    expect(getCustomer.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      customerId,
      type: 'customer',
      name: 'Acme Co',
      email: 'ops@acme.com',
      avatarUrl: 'https://static.natural.com/avatars/acme-co.png',
      createdAt: '2026-01-04T15:30:00.000Z',
      delegationId: 'dlg_550e8400e29b41d4a716446655440000',
      status: 'ACTIVE',
      delegation: customer.attributes.delegation,
      agents: customer.attributes.agents,
      relationships: customer.relationships,
      customer
    });
  });
});
