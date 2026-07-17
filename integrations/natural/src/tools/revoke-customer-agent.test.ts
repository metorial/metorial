import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { revokeCustomerAgent } from './customers';

const customerId = 'pty_4A8C/opaque?customer=1#customer🚀';
const agentId = 'agt_3C4D/opaque?agent=1#agent🚀';

const validInput = {
  customerId,
  agentId,
  confirm: true
};

const customer = {
  type: 'customer',
  id: customerId,
  attributes: {
    name: 'Acme Co',
    email: 'ops@acme.example',
    avatarUrl: 'https://cdn.acme.example/avatar.png',
    createdAt: '2026-01-10T12:00:00.000Z',
    delegation: {
      id: 'dlg_550e8400e29b41d4a716446655440000',
      status: 'ACTIVE',
      permissions: ['payments.read'],
      createdAt: '2026-01-10T12:00:00.000Z',
      futureDelegationField: 'preserved'
    },
    agents: [
      {
        id: 'agt_future/connected?version=2',
        name: null,
        status: 'ACTIVE',
        permissions: ['payments.read'],
        limits: { perTransaction: 100_000, futureLimitField: 'preserved' },
        futureAgentField: 'preserved'
      }
    ],
    futureCustomerField: 'preserved'
  },
  relationships: {
    party: { data: { type: 'party', id: customerId } }
  },
  futureResourceField: 'preserved'
};

const meta = {
  deleted: true,
  requestId: 'req_123',
  futureMetaField: 'preserved'
};

const minimalSuccessfulResponse = {
  data: customer,
  meta: { deleted: true }
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('revoke_customer_agent', () => {
  it('accepts non-empty URI-encodable opaque pty_ and agt_ IDs and is destructive', () => {
    for (const validCustomerId of [
      'pty_4a8c9823f39c42a5b817556766551112',
      'pty_4A8C9823F39C42A5B817556766551112',
      'pty_short',
      customerId,
      'pty_未来🚀'
    ]) {
      expect(
        revokeCustomerAgent.inputSchema.safeParse({
          ...validInput,
          customerId: validCustomerId
        }).success
      ).toBe(true);
    }

    for (const validAgentId of [
      'agt_3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
      'agt_3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F',
      'agt_short',
      agentId,
      'agt_未来🚀'
    ]) {
      expect(
        revokeCustomerAgent.inputSchema.safeParse({ ...validInput, agentId: validAgentId })
          .success
      ).toBe(true);
    }

    for (const input of [
      { ...validInput, customerId: '' },
      { ...validInput, customerId: 'pty_' },
      { ...validInput, customerId: 'agt_customer' },
      { ...validInput, customerId: 'PTY_customer' },
      { ...validInput, customerId: 'pty_future\uD800' },
      { ...validInput, customerId: 'pty_future\uDC00' },
      { ...validInput, agentId: '' },
      { ...validInput, agentId: 'agt_' },
      { ...validInput, agentId: 'pty_agent' },
      { ...validInput, agentId: 'AGT_agent' },
      { ...validInput, agentId: 'agt_future\uD800' },
      { ...validInput, agentId: 'agt_future\uDC00' }
    ]) {
      expect(revokeCustomerAgent.inputSchema.safeParse(input).success).toBe(false);
    }

    expect(revokeCustomerAgent.tags).toMatchObject({ destructive: true });
    expect(revokeCustomerAgent.description).toContain('requires confirmation');
    expect(revokeCustomerAgent.description).toContain('bodyless DELETE');
    expect(revokeCustomerAgent.description).toContain('no documented idempotency key');
  });

  it('requires explicit confirmation before revoking access', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');

    await expect(
      revokeCustomerAgent.handleInvocation({
        input: { ...validInput, confirm: false },
        auth: { token: 'sk_ntl_test', keyType: 'party_key' },
        config: {}
      } as never)
    ).rejects.toThrow(/confirm/i);

    expect(request).not.toHaveBeenCalled();
  });

  it('encodes both opaque path segments, sends a bodyless DELETE, and preserves complete raw response data', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: customer,
      meta,
      futureEnvelopeField: 'accepted'
    });

    const result = await revokeCustomerAgent.handleInvocation({
      input: validInput,
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'revoke customer agent',
      'delete',
      `/customers/${encodeURIComponent(customerId)}/agents/${encodeURIComponent(agentId)}`
    );
    expect(revokeCustomerAgent.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      customerId,
      agentId,
      type: 'customer',
      status: 'ACTIVE',
      customer,
      deleted: true,
      meta
    });
    expect(result.message).toBe(
      `Revoked agent **${agentId}** from customer **${customerId}**.`
    );
  });

  it('does not claim provider deletion confirmation when optional metadata is absent', async () => {
    const revokedCustomer = {
      ...customer,
      attributes: {
        ...customer.attributes,
        delegation: { ...customer.attributes.delegation, status: 'REVOKED' }
      }
    };
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: revokedCustomer
    });

    const result = await revokeCustomerAgent.handleInvocation({
      input: validInput,
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(revokeCustomerAgent.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      customerId,
      agentId,
      type: 'customer',
      status: 'REVOKED',
      customer: revokedCustomer,
      deleted: false,
      meta: {}
    });
  });

  it('rejects a successful response for a different customer ID', async () => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      ...minimalSuccessfulResponse,
      data: { ...customer, id: 'pty_different' }
    });

    const error = await revokeCustomerAgent
      .handleInvocation({
        input: validInput,
        auth: { token: 'sk_ntl_test', keyType: 'party_key' },
        config: {}
      } as never)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different customer than the one requested/i);
    expect(error.message).toMatch(/verify customer delegation state.*before retrying/i);
    expect(error.message).toMatch(/non-idempotent request/i);
  });

  it.each([
    ['data', { meta: { deleted: true } }],
    ['resource type', { ...minimalSuccessfulResponse, data: { ...customer, type: 'party' } }],
    ['resource ID', { ...minimalSuccessfulResponse, data: { ...customer, id: 'pty_' } }],
    [
      'customer name',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...customer,
          attributes: { ...customer.attributes, name: undefined }
        }
      }
    ],
    [
      'customer email',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...customer,
          attributes: { ...customer.attributes, email: undefined }
        }
      }
    ],
    [
      'customer avatar URL',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...customer,
          attributes: { ...customer.attributes, avatarUrl: 'not a URI' }
        }
      }
    ],
    [
      'customer creation time',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...customer,
          attributes: { ...customer.attributes, createdAt: 'not-a-date-time' }
        }
      }
    ],
    [
      'delegation ID',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...customer,
          attributes: {
            ...customer.attributes,
            delegation: { ...customer.attributes.delegation, id: undefined }
          }
        }
      }
    ],
    [
      'delegation status',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...customer,
          attributes: {
            ...customer.attributes,
            delegation: { ...customer.attributes.delegation, status: undefined }
          }
        }
      }
    ],
    [
      'delegation permissions',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...customer,
          attributes: {
            ...customer.attributes,
            delegation: { ...customer.attributes.delegation, permissions: undefined }
          }
        }
      }
    ],
    [
      'delegation creation time',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...customer,
          attributes: {
            ...customer.attributes,
            delegation: { ...customer.attributes.delegation, createdAt: undefined }
          }
        }
      }
    ],
    [
      'connected agents',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...customer,
          attributes: { ...customer.attributes, agents: undefined }
        }
      }
    ],
    [
      'connected agent fields',
      {
        ...minimalSuccessfulResponse,
        data: {
          ...customer,
          attributes: {
            ...customer.attributes,
            agents: [{ ...customer.attributes.agents[0], limits: undefined }]
          }
        }
      }
    ],
    ['deleted confirmation', { ...minimalSuccessfulResponse, meta: { deleted: false } }]
  ])('rejects a malformed successful response missing or invalid %s', async (_field, response) => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

    const error = await revokeCustomerAgent
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
    expect(error.message).toMatch(/verify customer delegation state.*before retrying/i);
    expect(error.message).toMatch(/non-idempotent request/i);
  });
});
