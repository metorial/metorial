import { ServiceError } from '@lowerdeck/error';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NATURAL_API_BASE_URL, NaturalClient } from './client';

const requestSpy = (client: NaturalClient) => {
  const axios = (
    client as unknown as {
      axios: { request: (config: unknown) => Promise<{ data: unknown }> };
    }
  ).axios;

  return vi.spyOn(axios, 'request').mockResolvedValue({ data: { ok: true } });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NaturalClient', () => {
  it('uses the current Natural API host', () => {
    const client = new NaturalClient({
      auth: { token: 'pk_test', keyType: 'party_key' },
      config: {}
    });

    const axios = (client as unknown as { axios: { defaults: { baseURL?: string } } }).axios;

    expect(NATURAL_API_BASE_URL).toBe('https://api.natural.com');
    expect(axios.defaults.baseURL).toBe(NATURAL_API_BASE_URL);
  });

  it('rejects agent-attributed money movement without an instance ID before HTTP dispatch', async () => {
    const client = new NaturalClient({
      auth: { token: 'ak_test', keyType: 'agent_key' },
      config: {}
    });
    const request = requestSpy(client);

    const error = await client
      .request('create payment', 'post', '/payments', { requiresAgentInstance: true })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_validation_error');
    expect(error.message).toMatch(/X-Instance-ID.+agent-attributed money movement/i);
    expect(request).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only per-request instance ID as missing for agent keys', async () => {
    const client = new NaturalClient({
      auth: { token: 'ak_test', keyType: 'agent_key' },
      config: {}
    });
    const request = requestSpy(client);

    await expect(
      client.request('create payment', 'post', '/payments', {
        requiresAgentInstance: true,
        instanceId: '   '
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    {
      source: 'configured',
      config: { instanceId: 'instance_configured' },
      requestOptions: {},
      expected: 'instance_configured'
    },
    {
      source: 'per-request',
      config: {},
      requestOptions: { instanceId: 'instance_per_request' },
      expected: 'instance_per_request'
    }
  ])('sends a $source instance ID for agent-attributed money movement', async setup => {
    const client = new NaturalClient({
      auth: { token: 'ak_test', keyType: 'agent_key' },
      config: setup.config
    });
    const request = requestSpy(client);

    await client.request('create payment', 'post', '/payments', {
      requiresAgentInstance: true,
      ...setup.requestOptions
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          'X-Instance-ID': setup.expected
        }
      })
    );
  });

  it('prefers a per-request agent instance ID over the configured default', async () => {
    const client = new NaturalClient({
      auth: { token: 'ak_test', keyType: 'agent_key' },
      config: { instanceId: 'instance_configured' }
    });
    const request = requestSpy(client);

    await client.request('create payment', 'post', '/payments', {
      requiresAgentInstance: true,
      instanceId: 'instance_per_request'
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          'X-Instance-ID': 'instance_per_request'
        }
      })
    );
  });

  it.each([
    {
      mode: 'explicitly false',
      requestOptions: { requiresAgentInstance: false }
    },
    {
      mode: 'omitted',
      requestOptions: {}
    }
  ])('dispatches agent-key requests when requiresAgentInstance is $mode', async setup => {
    const client = new NaturalClient({
      auth: { token: 'ak_test', keyType: 'agent_key' },
      config: {}
    });
    const request = requestSpy(client);

    await client.request('list payments', 'get', '/payments', setup.requestOptions);

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {}
      })
    );
  });

  it.each([
    'party_key',
    'unknown'
  ] as const)('does not require an instance ID for %s authentication', async keyType => {
    const client = new NaturalClient({ auth: { token: 'key_test', keyType }, config: {} });
    const request = requestSpy(client);

    await client.request('create payment', 'post', '/payments', {
      requiresAgentInstance: true
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {}
      })
    );
  });

  it('preserves the prohibition on X-Agent-ID with agent-key authentication', async () => {
    const client = new NaturalClient({
      auth: { token: 'ak_test', keyType: 'agent_key' },
      config: { agentId: 'agt_123', instanceId: 'instance_123' }
    });
    const request = requestSpy(client);

    await expect(
      client.request('create payment', 'post', '/payments', {
        requiresAgentInstance: true
      })
    ).rejects.toThrow(/Do not configure X-Agent-ID.+agent key/i);
    expect(request).not.toHaveBeenCalled();
  });

  it('preserves party-key X-Agent-ID and X-Instance-ID attribution', async () => {
    const client = new NaturalClient({
      auth: { token: 'pk_test', keyType: 'party_key' },
      config: { agentId: 'agt_123', instanceId: 'instance_123' }
    });
    const request = requestSpy(client);

    await client.request('create payment', 'post', '/payments', {
      requiresAgentInstance: true
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          'X-Agent-ID': 'agt_123',
          'X-Instance-ID': 'instance_123'
        }
      })
    );
  });
});
