import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaturalClient } from '../lib/client';
import { revokeAgentCustomer } from './agents';
import { revokeCustomerAgent } from './customers';

const agentId = 'legacy/Agent?#🚀';
const customerId = 'customer/Region?#🚀';
const idempotencyKey = 'revoke-agent-customer-1';

const validInput = {
  agentId,
  customerId,
  idempotencyKey,
  confirm: true
};

const minimalSuccessfulResponse = {
  data: {
    type: 'customer',
    id: customerId,
    attributes: { status: 'REVOKED' }
  },
  meta: { deleted: true }
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('revoke_agent_customer', () => {
  it('is deprecated in favor of revoke_customer_agent while preserving destructive metadata', () => {
    expect(revokeAgentCustomer.key).toBe('revoke_agent_customer');
    expect(revokeCustomerAgent.key).toBe('revoke_customer_agent');
    expect(revokeAgentCustomer.description).toMatch(
      /^DEPRECATED — use `revoke_customer_agent` instead\. /
    );
    expect(revokeAgentCustomer.tags).toMatchObject({
      destructive: true,
      deprecated: true
    });
    expect(revokeAgentCustomer.instructions).toContain(
      'Use `revoke_customer_agent` for new calls. Keep `revoke_agent_customer` only for compatibility with existing workflows.'
    );
  });

  it('accepts non-empty URI-encodable opaque agent and customer references', () => {
    for (const input of [
      validInput,
      { ...validInput, agentId: 'agent-reference', customerId: 'customer-reference' },
      { ...validInput, agentId: 'agt_future_format', customerId: 'pty_future_format' },
      { ...validInput, agentId: '未来-agent', customerId: 'Ops@Example.COM' }
    ]) {
      expect(revokeAgentCustomer.inputSchema.safeParse(input).success).toBe(true);
    }

    for (const input of [
      { ...validInput, agentId: '' },
      { ...validInput, customerId: '' },
      { ...validInput, agentId: 'agent\uD800' },
      { ...validInput, customerId: 'customer\uDC00' }
    ]) {
      expect(revokeAgentCustomer.inputSchema.safeParse(input).success).toBe(false);
    }
  });

  it('requires explicit confirmation and an idempotency key before revoking', async () => {
    const request = vi.spyOn(NaturalClient.prototype, 'request');
    const context = {
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    };

    await expect(
      revokeAgentCustomer.handleInvocation({
        ...context,
        input: { ...validInput, confirm: false }
      } as never)
    ).rejects.toThrow(/confirm/i);
    await expect(
      revokeAgentCustomer.handleInvocation({
        ...context,
        input: { ...validInput, idempotencyKey: undefined }
      } as never)
    ).rejects.toThrow(/idempotencyKey/i);
    expect(request).not.toHaveBeenCalled();
  });

  it('sends a bodyless DELETE with encoded references and preserves raw response fields', async () => {
    const customer = {
      type: 'customer',
      id: customerId,
      attributes: {
        name: 'Acme Co',
        email: 'ops@example.com',
        status: 'REVOKED',
        permissions: ['payments.read'],
        limits: { perTransaction: 100000 },
        createdAt: '2026-01-10T12:00:00.000Z',
        updatedAt: '2026-07-16T10:20:00.000Z',
        futureCustomerField: 'preserved'
      },
      relationships: {
        agent: {
          data: {
            type: 'agent',
            id: agentId,
            attributes: { name: 'Invoice Agent' }
          }
        }
      },
      futureResourceField: 'preserved'
    };
    const meta = { deleted: true, requestId: 'req_123', futureMetaField: 'preserved' };
    const request = vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      data: customer,
      meta,
      futureEnvelopeField: 'accepted'
    });

    const result = await revokeAgentCustomer.handleInvocation({
      input: validInput,
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'revoke agent customer',
      'delete',
      `/agents/${encodeURIComponent(agentId)}/customers/${encodeURIComponent(customerId)}`,
      { idempotencyKey }
    );
    expect(revokeAgentCustomer.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      agentId,
      customerReference: customerId,
      customerId,
      type: 'customer',
      status: 'REVOKED',
      customer,
      deleted: true,
      meta
    });
    expect(result.message).toBe(
      `Revoked customer **${customerId}** from agent **${agentId}**.`
    );
  });

  it('keeps customerId for a normalized email and accepts the SDK string deletion marker', async () => {
    const requestedCustomerReference = 'Ops@Example.COM';
    const returnedCustomerReference = 'ops@example.com';
    const customer = {
      type: 'customer',
      id: returnedCustomerReference,
      attributes: { status: 'REVOKED' }
    };
    const meta = { deleted: 'true', futureMetaField: 'preserved' };
    const request = vi
      .spyOn(NaturalClient.prototype, 'request')
      .mockResolvedValue({ data: customer, meta });

    const result = await revokeAgentCustomer.handleInvocation({
      input: { ...validInput, customerId: requestedCustomerReference },
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    } as never);

    expect(request).toHaveBeenCalledWith(
      'revoke agent customer',
      'delete',
      `/agents/${encodeURIComponent(agentId)}/customers/${encodeURIComponent(requestedCustomerReference)}`,
      { idempotencyKey }
    );
    expect(revokeAgentCustomer.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      agentId,
      customerReference: returnedCustomerReference,
      customerId: returnedCustomerReference,
      type: 'customer',
      status: 'REVOKED',
      customer,
      deleted: true,
      meta
    });
  });

  it('rejects a successful response for a different normalized customer reference', async () => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue({
      ...minimalSuccessfulResponse,
      data: {
        ...minimalSuccessfulResponse.data,
        id: 'different-customer-reference'
      }
    });

    const error = await revokeAgentCustomer
      .handleInvocation({
        input: validInput,
        auth: { token: 'sk_ntl_test', keyType: 'party_key' },
        config: {}
      } as never)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different customer reference than the one requested/i);
    expect(error.message).toMatch(/verify customer access.*before retrying/i);
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
        data: { ...minimalSuccessfulResponse.data, id: '' }
      }
    ],
    [
      'attributes',
      {
        ...minimalSuccessfulResponse,
        data: { type: 'customer', id: customerId }
      }
    ],
    [
      'status',
      {
        ...minimalSuccessfulResponse,
        data: { ...minimalSuccessfulResponse.data, attributes: {} }
      }
    ],
    ['meta', { data: minimalSuccessfulResponse.data }],
    [
      'boolean deletion confirmation',
      { ...minimalSuccessfulResponse, meta: { deleted: false } }
    ],
    [
      'string deletion confirmation',
      { ...minimalSuccessfulResponse, meta: { deleted: 'false' } }
    ]
  ])('rejects a malformed successful response with invalid %s', async (_field, response) => {
    vi.spyOn(NaturalClient.prototype, 'request').mockResolvedValue(response);

    const error = await revokeAgentCustomer
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
    expect(error.message).toMatch(/verify customer access.*before retrying/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });
});
