import { ServiceError } from '@lowerdeck/error';
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

const createAgentKeyEnvelope = (agentId = 'agt_future/key:v2🚀') => ({
  data: {
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
      revokedBy: null,
      expiresAt: null
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
          id: agentId
        }
      }
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
    const secret = 'sk_ntl_prod_secret';
    const createdKey = {
      id: 'apy_550e8400e29b41d4a716446655440000',
      type: 'apiKey',
      attributes: {
        apiKeyPrefix: 'sk_ntl_prod_sxHp_FRoRTnDEmEH',
        apiKey: secret,
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
      },
      meta: { auditLabel: 'created-api-key' },
      apiKey: secret
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
      apiKey: secret,
      key: {
        id: createdKey.id,
        type: createdKey.type,
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
        relationships: createdKey.relationships,
        meta: createdKey.meta
      }
    });
    expect(result.output.key.attributes).not.toHaveProperty('apiKey');
    expect(result.output.key).not.toHaveProperty('apiKey');
    expect(JSON.stringify(result.output).split(secret)).toHaveLength(2);
  });

  it('accepts Natural external-account creation scope for API keys', () => {
    expect(
      createApiKey.inputSchema.safeParse({
        name: 'External Account Linker',
        scopes: ['external_accounts.create'],
        confirm: true
      }).success
    ).toBe(true);
    expect(
      createApiKey.inputSchema.safeParse({
        name: 'Invalid External Account Reader',
        scopes: ['external_accounts.read'],
        confirm: true
      }).success
    ).toBe(false);
  });

  it('accepts opaque nonempty Natural API key IDs and is marked destructive', () => {
    const validInput = {
      keyId: 'apy_550e8400e29b41d4a716446655440000',
      idempotencyKey: 'revoke-api-key-1',
      confirm: true
    };

    expect(revokeApiKey.inputSchema.safeParse(validInput).success).toBe(true);
    expect(
      revokeApiKey.inputSchema.safeParse({ ...validInput, keyId: 'apy_future/key:v2' }).success
    ).toBe(true);
    for (const keyId of [
      '',
      'apy_',
      'agk_550e8400e29b41d4a716446655440000',
      'sk_ntl_prod_secret'
    ]) {
      expect(revokeApiKey.inputSchema.safeParse({ ...validInput, keyId }).success).toBe(false);
    }
    expect(revokeApiKey.tags).toMatchObject({ destructive: true });
    expect(revokeApiKey.description).toContain('no longer authenticate');
    expect(revokeApiKey.description).toContain('idempotency key');
  });

  it('rejects malformed UTF-16 API key IDs during schema validation', () => {
    const validInput = {
      keyId: 'apy_future/key:v2\u{1F680}',
      idempotencyKey: 'revoke-api-key-1',
      confirm: true
    };

    expect(revokeApiKey.inputSchema.safeParse(validInput).success).toBe(true);
    for (const keyId of ['apy_future\uD800', 'apy_future\uDC00']) {
      const result = revokeApiKey.inputSchema.safeParse({ ...validInput, keyId });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: 'Natural API key ID must be well-formed Unicode.'
            })
          ])
        );
      }
    }
    expect(naturalClientMocks.request).not.toHaveBeenCalled();
  });

  it('requires explicit confirmation and an idempotency key before revoking', async () => {
    const context = {
      auth: { token: 'sk_ntl_test', keyType: 'party_key' },
      config: {}
    };
    const keyId = 'apy_550e8400e29b41d4a716446655440000';

    await expect(
      revokeApiKey.handleInvocation({
        ...context,
        input: { keyId, idempotencyKey: 'revoke-api-key-1', confirm: false }
      } as any)
    ).rejects.toThrow(/confirm/i);
    await expect(
      revokeApiKey.handleInvocation({
        ...context,
        input: { keyId, confirm: true }
      } as any)
    ).rejects.toThrow(/idempotencyKey/i);
    expect(naturalClientMocks.request).not.toHaveBeenCalled();
  });

  it('accepts opaque nonempty Natural API key IDs and rejects unsafe or wrong-family values', () => {
    const validKeyIds = [
      'apy_550e8400e29b41d4a716446655440000',
      'apy_future-version',
      'apy_future/key:v2',
      'apy_未来🚀'
    ];
    const invalidKeyIds = [
      '',
      'apy_',
      'agk_550e8400e29b41d4a716446655440000',
      'sk_ntl_prod_secret',
      'apy_future\uD800',
      'apy_future\uDC00'
    ];

    for (const keyId of validKeyIds) {
      expect(getApiKey.inputSchema.safeParse({ keyId }).success).toBe(true);
    }
    for (const keyId of invalidKeyIds) {
      expect(getApiKey.inputSchema.safeParse({ keyId }).success).toBe(false);
    }
  });

  it('gets API keys by ID with useful non-secret metadata, then revokes by ID', async () => {
    const key = {
      id: 'apy_550e8400e29b41d4a716446655440000',
      type: 'apiKey',
      attributes: {
        apiKeyPrefix: 'sk_ntl_prod_sxHp_FRoRTnDEmEH',
        apiKey: 'sk_ntl_prod_secret-that-must-not-leak',
        name: 'Production Backend',
        scopes: ['payments.read', 'payments.create'],
        environment: 'prod',
        status: 'REVOKED',
        createdAt: '2026-01-04T15:30:00Z',
        lastUsedAt: '2026-01-05T10:00:00Z',
        revokedAt: '2026-01-06T11:00:00Z',
        createdBy: 'usr_550e8400e29b41d4a716446655440000',
        revokedBy: 'usr_650e8400e29b41d4a716446655440000'
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
    naturalClientMocks.request
      .mockResolvedValueOnce({ data: key })
      .mockResolvedValueOnce({ data: key, meta: { deleted: true } });

    const getKeyId = 'apy_future/key:v2🚀';
    const getResult = await getApiKey.handleInvocation(createCtx({ keyId: getKeyId }));
    const revokeKeyId = 'apy_future/key:v2';
    const revokeResult = await revokeApiKey.handleInvocation(
      createCtx({
        keyId: revokeKeyId,
        idempotencyKey: 'revoke-api-key-1',
        confirm: true
      })
    );

    expect(naturalClientMocks.request).toHaveBeenNthCalledWith(
      1,
      'get api key',
      'get',
      '/api-keys/apy_future%2Fkey%3Av2%F0%9F%9A%80'
    );
    expect(naturalClientMocks.request).toHaveBeenNthCalledWith(
      2,
      'revoke api key',
      'delete',
      '/api-keys/apy_future%2Fkey%3Av2',
      { idempotencyKey: 'revoke-api-key-1' }
    );
    expect(getResult.output).toMatchObject({
      keyId: 'apy_550e8400e29b41d4a716446655440000',
      type: 'apiKey',
      name: 'Production Backend',
      status: 'REVOKED',
      scopes: ['payments.read', 'payments.create'],
      apiKeyPrefix: 'sk_ntl_prod_sxHp_FRoRTnDEmEH',
      environment: 'prod',
      createdAt: '2026-01-04T15:30:00Z',
      lastUsedAt: '2026-01-05T10:00:00Z',
      revokedAt: '2026-01-06T11:00:00Z',
      key: {
        id: 'apy_550e8400e29b41d4a716446655440000',
        type: 'apiKey',
        attributes: {
          apiKeyPrefix: 'sk_ntl_prod_sxHp_FRoRTnDEmEH',
          name: 'Production Backend',
          createdBy: 'usr_550e8400e29b41d4a716446655440000',
          revokedBy: 'usr_650e8400e29b41d4a716446655440000'
        },
        relationships: key.relationships
      }
    });
    expect(getResult.output.key.attributes).not.toHaveProperty('apiKey');
    expect(getApiKey.outputSchema.safeParse(getResult.output).success).toBe(true);
    expect(revokeResult.output).toMatchObject({
      keyId: 'apy_550e8400e29b41d4a716446655440000',
      type: 'apiKey',
      status: 'REVOKED',
      deleted: true,
      key: {
        id: key.id,
        type: key.type,
        attributes: {
          apiKeyPrefix: 'sk_ntl_prod_sxHp_FRoRTnDEmEH',
          name: 'Production Backend',
          status: 'REVOKED',
          revokedAt: '2026-01-06T11:00:00Z'
        },
        relationships: key.relationships
      }
    });
    expect(revokeResult.output.key.attributes).not.toHaveProperty('apiKey');
    expect(JSON.stringify(revokeResult.output)).not.toContain('secret-that-must-not-leak');
    expect(revokeApiKey.outputSchema.safeParse(revokeResult.output).success).toBe(true);
  });

  it('lists non-secret agent key resources with documented filtering and pagination', async () => {
    const agentKey = {
      id: 'agk_550e8400e29b41d4a716446655440000',
      type: 'agentKey',
      attributes: {
        agentKeyPrefix: 'ak_ntl_prod_sxHp_FRoRTnDEmEH',
        agentKey: 'ak_ntl_prod_secret-that-must-not-leak',
        status: 'ACTIVE',
        createdAt: '2026-01-04T15:30:00Z',
        lastUsedAt: null,
        revokedAt: null,
        createdBy: 'usr_550e8400e29b41d4a716446655440000',
        revokedBy: null,
        expiresAt: null
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
      },
      meta: {
        auditLabel: 'primary-agent-key'
      },
      agentKey: 'root-secret-that-must-not-leak'
    };
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(agentKey));

    for (const agentId of [
      'agt_019cd1798d637a4da75dce386343931d',
      'agt_future_format',
      'legacy-agent-reference'
    ]) {
      expect(listAgentKeys.inputSchema.safeParse({ agentId, limit: 25 }).success).toBe(true);
    }
    expect(listAgentKeys.inputSchema.safeParse({ agentId: '', limit: 25 }).success).toBe(
      false
    );

    const result = await listAgentKeys.handleInvocation(
      createCtx({
        agentId: 'legacy-agent-reference',
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
          agentId: 'legacy-agent-reference',
          cursor: 'cur_123',
          limit: 25
        }
      }
    );
    expect(result.output).toEqual({
      agentKeys: [
        {
          id: agentKey.id,
          type: agentKey.type,
          attributes: {
            agentKeyPrefix: 'ak_ntl_prod_sxHp_FRoRTnDEmEH',
            status: 'ACTIVE',
            createdAt: '2026-01-04T15:30:00Z',
            lastUsedAt: null,
            revokedAt: null,
            createdBy: 'usr_550e8400e29b41d4a716446655440000',
            revokedBy: null,
            expiresAt: null
          },
          relationships: agentKey.relationships,
          meta: agentKey.meta
        }
      ],
      pagination: {
        hasMore: false,
        nextCursor: null
      }
    });
    expect(JSON.stringify(result.output)).not.toContain('secret-that-must-not-leak');
    expect(listAgentKeys.outputSchema.safeParse(result.output).success).toBe(true);
  });

  it('validates, confirms, and creates an agent key with one secret copy plus metadata', async () => {
    const agentKeySecret = 'ak_ntl_prod_secret';
    const agentId = 'agt_future/key:v2🚀';
    const partyId = 'pty_7c9e6679e29b41d4a716446655440001';
    const createdKey = {
      id: 'agk_550e8400e29b41d4a716446655440000',
      type: 'agentKey',
      attributes: {
        agentKeyPrefix: 'ak_ntl_prod_sxHp_FRoRTnDEmEH',
        agentKey: agentKeySecret,
        status: 'ACTIVE',
        createdAt: '2026-01-04T15:30:00Z',
        lastUsedAt: null,
        revokedAt: null,
        createdBy: 'usr_550e8400e29b41d4a716446655440000',
        revokedBy: null,
        expiresAt: null,
        futureLifecycleField: 'preserved'
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: partyId,
            futurePartyIdentifierField: 'preserved'
          },
          futurePartyRelationshipField: 'preserved'
        },
        agent: {
          data: {
            type: 'agent',
            id: agentId,
            futureAgentIdentifierField: 'preserved'
          },
          futureAgentRelationshipField: 'preserved'
        },
        futureRelationship: {
          data: null
        }
      },
      meta: {
        requestId: 'req_agent_key_create'
      },
      futureResourceField: 'preserved',
      agentKey: 'root-secret-that-must-not-leak'
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: createdKey });

    const validInput = {
      agentId,
      confirm: true
    };
    expect(createAgentKey.inputSchema.safeParse(validInput).success).toBe(true);
    expect(
      createAgentKey.inputSchema.safeParse({
        ...validInput,
        agentId: 'agt_019cd1798d637a4da75dce386343931d'
      }).success
    ).toBe(true);
    expect(
      createAgentKey.inputSchema.safeParse({ ...validInput, agentId: 'agt_' }).success
    ).toBe(false);
    expect(
      createAgentKey.inputSchema.safeParse({ ...validInput, agentId: 'agent_future' }).success
    ).toBe(false);
    expect(
      createAgentKey.inputSchema.safeParse({ ...validInput, agentId: 'agt_future\uD800' })
        .success
    ).toBe(false);
    await expect(
      createAgentKey.handleInvocation(createCtx({ ...validInput, confirm: false }))
    ).rejects.toThrow(/confirm/i);
    expect(naturalClientMocks.request).not.toHaveBeenCalled();

    const result = await createAgentKey.handleInvocation(createCtx(validInput));

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
                  id: agentId
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
      agentKeyPrefix: 'ak_ntl_prod_sxHp_FRoRTnDEmEH',
      createdAt: '2026-01-04T15:30:00Z',
      lastUsedAt: null,
      revokedAt: null,
      createdBy: 'usr_550e8400e29b41d4a716446655440000',
      revokedBy: null,
      expiresAt: null,
      partyId,
      agentId,
      relationships: createdKey.relationships,
      agentKey: agentKeySecret,
      key: {
        id: createdKey.id,
        type: createdKey.type,
        attributes: {
          agentKeyPrefix: 'ak_ntl_prod_sxHp_FRoRTnDEmEH',
          status: 'ACTIVE',
          createdAt: '2026-01-04T15:30:00Z',
          lastUsedAt: null,
          revokedAt: null,
          createdBy: 'usr_550e8400e29b41d4a716446655440000',
          revokedBy: null,
          expiresAt: null,
          futureLifecycleField: 'preserved'
        },
        relationships: createdKey.relationships,
        meta: createdKey.meta,
        futureResourceField: 'preserved'
      }
    });
    expect(result.output.key.attributes).not.toHaveProperty('agentKey');
    expect(result.output.key).not.toHaveProperty('agentKey');
    expect(JSON.stringify(result.output)).not.toContain('root-secret-that-must-not-leak');
    expect(JSON.stringify(result.output).split(agentKeySecret)).toHaveLength(2);
    expect(createAgentKey.outputSchema.safeParse(result.output).success).toBe(true);
  });

  it('rejects missing or malformed create-agent-key success fields with retry guidance', async () => {
    const valid = createAgentKeyEnvelope();
    const withAttribute = (name: string, value: unknown) => ({
      data: {
        ...valid.data,
        attributes: {
          ...valid.data.attributes,
          [name]: value
        }
      }
    });
    const malformedResponses: [string, unknown][] = [
      ['envelope data', {}],
      ['resource type', { data: { ...valid.data, type: 'apiKey' } }],
      ['resource id', { data: { ...valid.data, id: '' } }],
      ['attributes', { data: { ...valid.data, attributes: undefined } }],
      ['agent key prefix', withAttribute('agentKeyPrefix', undefined)],
      ['status', withAttribute('status', undefined)],
      ['created timestamp', withAttribute('createdAt', undefined)],
      ['last-used timestamp', withAttribute('lastUsedAt', undefined)],
      ['revoked timestamp', withAttribute('revokedAt', undefined)],
      ['creator', withAttribute('createdBy', undefined)],
      ['revoker', withAttribute('revokedBy', undefined)],
      ['expiration timestamp', withAttribute('expiresAt', undefined)],
      ['one-time secret', withAttribute('agentKey', undefined)],
      ['empty one-time secret', withAttribute('agentKey', '')],
      ['invalid lifecycle timestamp', withAttribute('createdAt', 'not-a-timestamp')],
      ['relationships', { data: { ...valid.data, relationships: undefined } }],
      [
        'party relationship',
        {
          data: {
            ...valid.data,
            relationships: { ...valid.data.relationships, party: undefined }
          }
        }
      ],
      [
        'party relationship data',
        {
          data: {
            ...valid.data,
            relationships: {
              ...valid.data.relationships,
              party: { data: null }
            }
          }
        }
      ],
      [
        'party relationship type',
        {
          data: {
            ...valid.data,
            relationships: {
              ...valid.data.relationships,
              party: {
                data: {
                  ...valid.data.relationships.party.data,
                  type: 'agent'
                }
              }
            }
          }
        }
      ],
      [
        'agent relationship',
        {
          data: {
            ...valid.data,
            relationships: { ...valid.data.relationships, agent: undefined }
          }
        }
      ],
      [
        'agent relationship data',
        {
          data: {
            ...valid.data,
            relationships: {
              ...valid.data.relationships,
              agent: { data: null }
            }
          }
        }
      ],
      [
        'agent relationship type',
        {
          data: {
            ...valid.data,
            relationships: {
              ...valid.data.relationships,
              agent: {
                data: {
                  ...valid.data.relationships.agent.data,
                  type: 'party'
                }
              }
            }
          }
        }
      ]
    ];

    for (const [_field, response] of malformedResponses) {
      naturalClientMocks.request.mockResolvedValueOnce(response);

      const error = await createAgentKey
        .handleInvocation(
          createCtx({
            agentId: valid.data.relationships.agent.data.id,
            confirm: true
          })
        )
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ServiceError);
      if (!(error instanceof ServiceError)) continue;

      expect(error.data.reason).toBe('natural_response_error');
      expect(error.message).toMatch(/malformed success response/i);
      expect(error.message).toMatch(/verify agent key state.*before retrying/i);
      expect(error.message).toMatch(/non-idempotent request/i);
    }
  });

  it('rejects a create-agent-key success response bound to a different agent', async () => {
    const requestedAgentId = 'agt_requested-agent';
    naturalClientMocks.request.mockResolvedValueOnce(
      createAgentKeyEnvelope('agt_different-agent')
    );

    const error = await createAgentKey
      .handleInvocation(createCtx({ agentId: requestedAgentId, confirm: true }))
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different agent/i);
    expect(error.message).toMatch(/verify agent key state.*before retrying/i);
    expect(error.message).toMatch(/non-idempotent request/i);
  });

  it('accepts URI-encodable opaque agent key IDs and is marked destructive', () => {
    const validInput = {
      keyId: 'agk_a',
      idempotencyKey: 'revoke-agent-key-1',
      confirm: true
    };

    expect(revokeAgentKey.inputSchema.safeParse(validInput).success).toBe(true);
    for (const keyId of ['agk_future/key:v2?part#1', 'agk_key-🚀', 'agk_ABC_opaque']) {
      expect(revokeAgentKey.inputSchema.safeParse({ ...validInput, keyId }).success).toBe(
        true
      );
    }
    for (const keyId of [
      'agk_',
      'agt_future-key',
      'apy_future-key',
      'agk_future\uD800',
      'agk_future\uDC00'
    ]) {
      expect(revokeAgentKey.inputSchema.safeParse({ ...validInput, keyId }).success).toBe(
        false
      );
    }
    expect(revokeAgentKey.tags).toMatchObject({ destructive: true });
    expect(revokeAgentKey.description).toContain('no longer authenticate');
    expect(revokeAgentKey.description).toContain('Other active keys');
    expect(revokeAgentKey.description).toContain('idempotency key');
  });

  it('requires explicit confirmation and an idempotency key before revoking an agent key', async () => {
    const keyId = 'agk_550e8400e29b41d4a716446655440000';

    await expect(
      revokeAgentKey.handleInvocation(
        createCtx({ keyId, idempotencyKey: 'revoke-agent-key-1', confirm: false })
      )
    ).rejects.toThrow(/confirm/i);
    await expect(
      revokeAgentKey.handleInvocation(createCtx({ keyId, confirm: true }))
    ).rejects.toThrow(/idempotencyKey/i);
    expect(naturalClientMocks.request).not.toHaveBeenCalled();
  });

  it('revokes agent keys without a request body and returns non-secret response metadata', async () => {
    const keyId = 'agk_future/key:v2🚀';
    const key = {
      id: keyId,
      type: 'agentKey',
      attributes: {
        agentKeyPrefix: 'ak_ntl_prod_sxHp_FRoRTnDEmEH',
        agentKey: 'ak_ntl_prod_secret-that-must-not-leak',
        status: 'REVOKED',
        createdAt: '2026-01-04T15:30:00Z',
        lastUsedAt: '2026-01-05T10:00:00Z',
        revokedAt: '2026-01-06T10:00:00Z',
        createdBy: 'usr_550e8400e29b41d4a716446655440000',
        revokedBy: 'usr_650e8400e29b41d4a716446655440000',
        expiresAt: null,
        futureAttribute: 'preserved'
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
      },
      meta: {
        auditLabel: 'revoked-agent-key'
      },
      links: {
        self: '/agent-keys/future-key'
      },
      agentKey: 'root-secret-that-must-not-leak'
    };
    const meta = {
      deleted: true as const,
      requestId: 'req_agent_key_revoke',
      futureMeta: { preserved: true }
    };
    naturalClientMocks.request.mockResolvedValueOnce({
      data: key,
      meta,
      futureEnvelopeField: 'accepted'
    });

    const result = await revokeAgentKey.handleInvocation(
      createCtx({
        keyId,
        idempotencyKey: 'revoke-agent-key-1',
        confirm: true
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'revoke agent key',
      'delete',
      '/agent-keys/agk_future%2Fkey%3Av2%F0%9F%9A%80',
      { idempotencyKey: 'revoke-agent-key-1' }
    );
    expect(result.output).toMatchObject({
      keyId,
      type: 'agentKey',
      status: 'REVOKED',
      deleted: true,
      meta,
      key: {
        id: key.id,
        type: key.type,
        attributes: {
          agentKeyPrefix: 'ak_ntl_prod_sxHp_FRoRTnDEmEH',
          status: 'REVOKED',
          createdAt: '2026-01-04T15:30:00Z',
          lastUsedAt: '2026-01-05T10:00:00Z',
          revokedAt: '2026-01-06T10:00:00Z',
          createdBy: 'usr_550e8400e29b41d4a716446655440000',
          revokedBy: 'usr_650e8400e29b41d4a716446655440000',
          expiresAt: null,
          futureAttribute: 'preserved'
        },
        relationships: key.relationships,
        meta: key.meta,
        links: key.links
      }
    });
    expect(result.output.key.attributes).not.toHaveProperty('agentKey');
    expect(result.output.key).not.toHaveProperty('agentKey');
    expect(JSON.stringify(result.output)).not.toContain('secret-that-must-not-leak');
    expect(revokeAgentKey.outputSchema.safeParse(result.output).success).toBe(true);
  });

  it('rejects malformed revoke-agent-key success responses with same-key retry guidance', async () => {
    const keyId = 'agk_future-key';
    const valid = {
      data: {
        id: keyId,
        type: 'agentKey',
        attributes: {
          agentKeyPrefix: 'ak_ntl_prod_sxHp_FRoRTnDEmEH',
          status: 'REVOKED',
          createdAt: '2026-01-04T15:30:00Z',
          lastUsedAt: '2026-01-05T10:00:00Z',
          revokedAt: '2026-01-06T10:00:00Z',
          createdBy: 'usr_550e8400e29b41d4a716446655440000',
          revokedBy: 'usr_650e8400e29b41d4a716446655440000',
          expiresAt: null
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
      },
      meta: { deleted: true }
    };
    const malformedResponses: [string, unknown][] = [
      ['missing resource', { meta: valid.meta }],
      ['missing ID', { ...valid, data: { ...valid.data, id: undefined } }],
      ['wrong resource type', { ...valid, data: { ...valid.data, type: 'apiKey' } }],
      ['missing attributes', { ...valid, data: { ...valid.data, attributes: undefined } }],
      [
        'wrong status',
        {
          ...valid,
          data: {
            ...valid.data,
            attributes: { ...valid.data.attributes, status: 'ACTIVE' }
          }
        }
      ],
      ...(
        [
          'agentKeyPrefix',
          'status',
          'createdAt',
          'lastUsedAt',
          'revokedAt',
          'createdBy',
          'revokedBy',
          'expiresAt'
        ] as const
      ).map(
        attribute =>
          [
            `missing lifecycle attribute ${attribute}`,
            {
              ...valid,
              data: {
                ...valid.data,
                attributes: { ...valid.data.attributes, [attribute]: undefined }
              }
            }
          ] as [string, unknown]
      ),
      [
        'missing relationships',
        { ...valid, data: { ...valid.data, relationships: undefined } }
      ],
      [
        'missing party relationship',
        {
          ...valid,
          data: {
            ...valid.data,
            relationships: { ...valid.data.relationships, party: undefined }
          }
        }
      ],
      [
        'missing agent relationship',
        {
          ...valid,
          data: {
            ...valid.data,
            relationships: { ...valid.data.relationships, agent: undefined }
          }
        }
      ],
      ['missing metadata', { data: valid.data }],
      ['unconfirmed deletion', { ...valid, meta: { deleted: false } }]
    ];

    for (const [label, response] of malformedResponses) {
      naturalClientMocks.request.mockResolvedValueOnce(response);

      const error = await revokeAgentKey
        .handleInvocation(
          createCtx({ keyId, idempotencyKey: 'revoke-agent-key-malformed', confirm: true })
        )
        .catch((caught: unknown) => caught);

      expect(error, label).toBeInstanceOf(ServiceError);
      if (!(error instanceof ServiceError)) continue;
      expect(error.data.reason, label).toBe('natural_response_error');
      expect(error.message, label).toMatch(/malformed success response/i);
      expect(error.message, label).toMatch(/same idempotency key/i);
    }
  });

  it('rejects a mismatched revoke-agent-key success resource with same-key retry guidance', async () => {
    naturalClientMocks.request.mockResolvedValueOnce({
      data: {
        id: 'agk_different-key',
        type: 'agentKey',
        attributes: {
          agentKeyPrefix: 'ak_ntl_prod_sxHp_FRoRTnDEmEH',
          status: 'REVOKED',
          createdAt: '2026-01-04T15:30:00Z',
          lastUsedAt: '2026-01-05T10:00:00Z',
          revokedAt: '2026-01-06T10:00:00Z',
          createdBy: 'usr_550e8400e29b41d4a716446655440000',
          revokedBy: 'usr_650e8400e29b41d4a716446655440000',
          expiresAt: null
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
      },
      meta: { deleted: true }
    });

    const error = await revokeAgentKey
      .handleInvocation(
        createCtx({
          keyId: 'agk_requested-key',
          idempotencyKey: 'revoke-agent-key-mismatch',
          confirm: true
        })
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;
    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different agent key/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });
});
