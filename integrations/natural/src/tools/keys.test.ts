import { beforeEach, describe, expect, it, vi } from 'vitest';

const naturalClientMocks = vi.hoisted(() => ({
  request: vi.fn()
}));

const NaturalClientMock = vi.hoisted(() => vi.fn(() => naturalClientMocks));

vi.mock('../lib/client', () => ({
  NaturalClient: NaturalClientMock
}));

import {
  createAgentKey,
  createApiKey,
  getApiKey,
  listAgentKeys,
  listApiKeys,
  revokeAgentKey,
  revokeApiKey
} from './keys';

const createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'sk_ntl_test', keyType: 'party_key' },
    config: {}
  }) as any;

const paginatedEnvelope = (record: Record<string, unknown>) => ({
  data: [record],
  meta: {
    pagination: {
      hasMore: false,
      nextCursor: null
    }
  }
});

describe('Natural key tools', () => {
  beforeEach(() => {
    naturalClientMocks.request.mockReset();
    NaturalClientMock.mockClear();
  });

  it('preserves full API key resources from list API keys', async () => {
    const apiKey = {
      id: 'apy_550e8400e29b41d4a716446655440000',
      type: 'apiKey',
      attributes: {
        apiKeyPrefix: 'sk_ntl_prod_sxHp_FRoRTnDEmEH',
        name: 'Production Backend',
        scopes: ['payments.read'],
        environment: 'prod',
        status: 'ACTIVE',
        createdAt: '2026-01-04T15:30:00Z',
        lastUsedAt: null,
        revokedAt: null,
        createdBy: 'usr_550e8400e29b41d4a716446655440000',
        revokedBy: null
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
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(apiKey));

    const result = await listApiKeys.handleInvocation(
      createCtx({
        status: 'ACTIVE',
        cursor: 'cur_123',
        limit: 25
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list api keys',
      'get',
      '/api-keys',
      {
        params: {
          status: 'ACTIVE',
          cursor: 'cur_123',
          limit: 25
        }
      }
    );
    expect(result.output.apiKeys).toEqual([apiKey]);
  });

  it('creates API keys with a JSON:API attributes body and returns the one-time secret', async () => {
    const createdKey = {
      id: 'apy_550e8400e29b41d4a716446655440000',
      type: 'apiKey',
      attributes: {
        apiKeyPrefix: 'sk_ntl_prod_sxHp_FRoRTnDEmEH',
        apiKey: 'sk_ntl_prod_secret',
        name: 'Production Backend',
        scopes: ['payments.read'],
        environment: 'prod',
        status: 'ACTIVE',
        createdAt: '2026-01-04T15:30:00Z',
        lastUsedAt: null,
        revokedAt: null,
        createdBy: 'usr_550e8400e29b41d4a716446655440000',
        revokedBy: null
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: createdKey });

    const result = await createApiKey.handleInvocation(
      createCtx({
        name: 'Production Backend',
        scopes: ['payments.read'],
        confirm: true
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'create api key',
      'post',
      '/api-keys',
      {
        body: {
          data: {
            attributes: {
              name: 'Production Backend',
              scopes: ['payments.read']
            }
          }
        }
      }
    );
    expect(result.output).toMatchObject({
      keyId: 'apy_550e8400e29b41d4a716446655440000',
      type: 'apiKey',
      status: 'ACTIVE',
      apiKey: 'sk_ntl_prod_secret',
      key: createdKey
    });
  });

  it('gets and revokes API keys by key ID', async () => {
    const key = {
      id: 'apy_550e8400e29b41d4a716446655440000',
      type: 'apiKey',
      attributes: {
        status: 'REVOKED'
      }
    };
    naturalClientMocks.request
      .mockResolvedValueOnce({ data: key })
      .mockResolvedValueOnce({ data: key, meta: { deleted: true } });

    const getResult = await getApiKey.handleInvocation(
      createCtx({
        keyId: 'apy_550e8400e29b41d4a716446655440000'
      })
    );
    const revokeResult = await revokeApiKey.handleInvocation(
      createCtx({
        keyId: 'apy_550e8400e29b41d4a716446655440000',
        idempotencyKey: 'revoke-api-key-1',
        confirm: true
      })
    );

    expect(naturalClientMocks.request).toHaveBeenNthCalledWith(
      1,
      'get api key',
      'get',
      '/api-keys/apy_550e8400e29b41d4a716446655440000'
    );
    expect(naturalClientMocks.request).toHaveBeenNthCalledWith(
      2,
      'revoke api key',
      'delete',
      '/api-keys/apy_550e8400e29b41d4a716446655440000',
      { idempotencyKey: 'revoke-api-key-1' }
    );
    expect(getResult.output.key).toEqual(key);
    expect(revokeResult.output).toMatchObject({
      keyId: 'apy_550e8400e29b41d4a716446655440000',
      type: 'apiKey',
      status: 'REVOKED',
      deleted: true,
      key
    });
  });

  it('preserves full agent key resources from list agent keys', async () => {
    const agentKey = {
      id: 'agk_550e8400e29b41d4a716446655440000',
      type: 'agentKey',
      attributes: {
        agentKeyPrefix: 'ak_ntl_prod_sxHp_FRoRTnDEmEH',
        status: 'ACTIVE',
        createdAt: '2026-01-04T15:30:00Z',
        lastUsedAt: null,
        revokedAt: null,
        createdBy: 'usr_550e8400e29b41d4a716446655440000',
        revokedBy: null
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: 'pty_7c9e6679e29b41d4a716446655440001'
          }
        },
        agent: {
          data: {
            type: 'agent',
            id: 'agt_019cd1798d637a4da75dce386343931d'
          }
        }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(agentKey));

    const result = await listAgentKeys.handleInvocation(
      createCtx({
        agentId: 'agt_019cd1798d637a4da75dce386343931d',
        cursor: 'cur_123',
        limit: 25
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list agent keys',
      'get',
      '/agent-keys',
      {
        params: {
          agentId: 'agt_019cd1798d637a4da75dce386343931d',
          cursor: 'cur_123',
          limit: 25
        }
      }
    );
    expect(result.output.agentKeys).toEqual([agentKey]);
  });

  it('creates agent keys with an empty attributes object plus agent relationship', async () => {
    const createdKey = {
      id: 'agk_550e8400e29b41d4a716446655440000',
      type: 'agentKey',
      attributes: {
        agentKeyPrefix: 'ak_ntl_prod_sxHp_FRoRTnDEmEH',
        agentKey: 'ak_ntl_prod_secret',
        status: 'ACTIVE',
        createdAt: '2026-01-04T15:30:00Z',
        lastUsedAt: null,
        revokedAt: null,
        createdBy: 'usr_550e8400e29b41d4a716446655440000',
        revokedBy: null
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: createdKey });

    const result = await createAgentKey.handleInvocation(
      createCtx({
        agentId: 'agt_019cd1798d637a4da75dce386343931d',
        confirm: true
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'create agent key',
      'post',
      '/agent-keys',
      {
        body: {
          data: {
            attributes: {},
            relationships: {
              agent: {
                data: {
                  type: 'agent',
                  id: 'agt_019cd1798d637a4da75dce386343931d'
                }
              }
            }
          }
        }
      }
    );
    expect(result.output).toMatchObject({
      keyId: 'agk_550e8400e29b41d4a716446655440000',
      type: 'agentKey',
      status: 'ACTIVE',
      agentKey: 'ak_ntl_prod_secret',
      key: createdKey
    });
  });

  it('revokes agent keys by key ID with the idempotency key header option', async () => {
    const key = {
      id: 'agk_550e8400e29b41d4a716446655440000',
      type: 'agentKey',
      attributes: {
        status: 'REVOKED'
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce({
      data: key,
      meta: { deleted: true }
    });

    const result = await revokeAgentKey.handleInvocation(
      createCtx({
        keyId: 'agk_550e8400e29b41d4a716446655440000',
        idempotencyKey: 'revoke-agent-key-1',
        confirm: true
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'revoke agent key',
      'delete',
      '/agent-keys/agk_550e8400e29b41d4a716446655440000',
      { idempotencyKey: 'revoke-agent-key-1' }
    );
    expect(result.output).toMatchObject({
      keyId: 'agk_550e8400e29b41d4a716446655440000',
      type: 'agentKey',
      status: 'REVOKED',
      deleted: true,
      key
    });
  });
});
