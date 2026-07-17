import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const naturalClientMocks = vi.hoisted(() => ({
  request: vi.fn()
}));

const NaturalClientMock = vi.hoisted(() => vi.fn(() => naturalClientMocks));

vi.mock('../lib/client', () => ({
  NaturalClient: NaturalClientMock
}));

import { provider } from '../index';
import { rotateAgentKey } from './rotate-agent-key';

const createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'sk_ntl_test', keyType: 'party_key' },
    config: {}
  }) as any;

const keyId = 'agk_future/key?revision=2#current🚀';
const partyId = 'pty_7c9e6679e29b41d4a716446655440001';
const agentId = 'agt_019cd1798d637a4da75dce386343931d';
const replacementSecret = 'ak_ntl_prod_Ab12Cd34Ef56Gh78mN90Pq12Rs34Tu56Vw78Xy90Za12Bc34';

const rotationEnvelope = (id = keyId, previousKeyExpiresAt: string | null = null) => ({
  data: {
    type: 'agentKey',
    id,
    agentKey: 'root-level-secret-canary',
    attributes: {
      agentKeyPrefix: 'ak_ntl_prod_Ab12Cd34Ef56Gh78',
      status: 'ACTIVE',
      createdAt: '2026-01-06T10:00:00Z',
      lastUsedAt: null,
      revokedAt: null,
      createdBy: 'usr_550e8400e29b41d4a716446655440000',
      revokedBy: null,
      expiresAt: null,
      agentKey: replacementSecret,
      previousKeyExpiresAt,
      futureLifecycleField: 'preserved'
    },
    relationships: {
      party: {
        data: { type: 'party', id: partyId },
        meta: { agentKey: 'relationship-secret-canary', label: 'owner' }
      },
      agent: {
        data: { type: 'agent', id: agentId }
      },
      futureRelationship: {
        data: { type: 'future', id: 'future_123' }
      }
    },
    meta: {
      auditLabel: 'rotated-agent-key',
      agentKey: 'resource-meta-secret-canary'
    },
    futureResourceField: 'preserved'
  },
  meta: {
    requestId: 'req_agent_key_rotate',
    agentKey: replacementSecret,
    nested: { agentKey: 'response-meta-secret-canary', trace: 'preserved' }
  }
});

const validInput = {
  keyId,
  expiresInSeconds: 0,
  idempotencyKey: 'rotate-agent-key-1',
  confirm: true
};

describe('rotate_agent_key', () => {
  beforeEach(() => {
    naturalClientMocks.request.mockReset();
    NaturalClientMock.mockClear();
  });

  it('is registered exactly once with a valid production tool ID and destructive tag', () => {
    expect(provider.actions.filter(action => action.key === 'rotate_agent_key')).toHaveLength(
      1
    );
    expect(`natural-${rotateAgentKey.key}`).toHaveLength(24);
    expect(rotateAgentKey.tags).toMatchObject({ destructive: true });
  });

  it('accepts opaque encodable agk_* IDs and both documented grace-period boundaries', () => {
    for (const opaqueKeyId of [
      'agk_0192ABC1def2789034567890abcdef12',
      'agk_future/format?revision=2#current',
      'agk_opaque-🚀'
    ]) {
      for (const expiresInSeconds of [0, 86400]) {
        expect(
          rotateAgentKey.inputSchema.safeParse({
            ...validInput,
            keyId: opaqueKeyId,
            expiresInSeconds
          }).success
        ).toBe(true);
      }
    }
  });

  it.each([
    ['wrong ID family', { keyId: 'apy_0192abc1def2789034567890abcdef12' }],
    ['empty ID suffix', { keyId: 'agk_' }],
    ['missing ID prefix delimiter', { keyId: 'agk' }],
    ['unpaired high surrogate', { keyId: 'agk_future\uD800' }],
    ['unpaired low surrogate', { keyId: 'agk_future\uDC00' }],
    ['negative grace period', { expiresInSeconds: -1 }],
    ['too-long grace period', { expiresInSeconds: 86401 }],
    ['fractional grace period', { expiresInSeconds: 0.5 }],
    ['empty idempotency key', { idempotencyKey: '' }],
    ['too-long idempotency key', { idempotencyKey: 'i'.repeat(256) }]
  ])('rejects %s', (_label, override) => {
    expect(rotateAgentKey.inputSchema.safeParse({ ...validInput, ...override }).success).toBe(
      false
    );
  });

  it('requires confirmation and idempotency before making a request', async () => {
    await expect(
      rotateAgentKey.handleInvocation(createCtx({ ...validInput, confirm: false }))
    ).rejects.toThrow(/confirm/i);
    await expect(
      rotateAgentKey.handleInvocation(createCtx({ ...validInput, idempotencyKey: undefined }))
    ).rejects.toThrow(/idempotencyKey/i);

    expect(naturalClientMocks.request).not.toHaveBeenCalled();
  });

  it('sends the encoded JSON:API rotation request and returns the secret exactly once', async () => {
    naturalClientMocks.request.mockResolvedValueOnce(
      rotationEnvelope(keyId, '2026-01-07T10:00:00Z')
    );

    const result = await rotateAgentKey.handleInvocation(
      createCtx({ ...validInput, expiresInSeconds: 86400 })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'rotate agent key',
      'post',
      '/agent-keys/agk_future%2Fkey%3Frevision%3D2%23current%F0%9F%9A%80/rotate',
      {
        idempotencyKey: 'rotate-agent-key-1',
        body: {
          data: {
            attributes: {
              expiresInSeconds: 86400
            }
          }
        }
      }
    );
    expect(rotateAgentKey.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toMatchObject({
      keyId,
      type: 'agentKey',
      status: 'ACTIVE',
      agentKeyPrefix: 'ak_ntl_prod_Ab12Cd34Ef56Gh78',
      createdAt: '2026-01-06T10:00:00Z',
      lastUsedAt: null,
      revokedAt: null,
      createdBy: 'usr_550e8400e29b41d4a716446655440000',
      revokedBy: null,
      expiresAt: null,
      previousKeyExpiresAt: '2026-01-07T10:00:00Z',
      partyId,
      agentId,
      agentKey: replacementSecret,
      meta: {
        requestId: 'req_agent_key_rotate',
        nested: { trace: 'preserved' }
      }
    });
    expect(result.output.key).toMatchObject({
      id: keyId,
      type: 'agentKey',
      attributes: {
        futureLifecycleField: 'preserved'
      },
      meta: {
        auditLabel: 'rotated-agent-key'
      },
      futureResourceField: 'preserved'
    });
    expect(result.output.relationships.party.meta).toEqual({ label: 'owner' });

    const serializedOutput = JSON.stringify(result.output);
    expect(serializedOutput.split(replacementSecret)).toHaveLength(2);
    expect(serializedOutput).not.toMatch(/secret-canary/);
    expect(result.output.key).not.toHaveProperty('agentKey');
    expect(result.output.key.attributes).not.toHaveProperty('agentKey');
    expect(result.message).not.toContain(replacementSecret);
  });

  it('sends the zero-second boundary and preserves a null previous-key expiry', async () => {
    naturalClientMocks.request.mockResolvedValueOnce(rotationEnvelope(keyId, null));

    const result = await rotateAgentKey.handleInvocation(createCtx(validInput));

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'rotate agent key',
      'post',
      expect.any(String),
      expect.objectContaining({
        body: {
          data: {
            attributes: { expiresInSeconds: 0 }
          }
        }
      })
    );
    expect(result.output.previousKeyExpiresAt).toBeNull();
  });

  it.each([
    ['missing data', () => ({})],
    [
      'wrong resource type',
      () => ({
        ...rotationEnvelope(),
        data: { ...rotationEnvelope().data, type: 'apiKey' }
      })
    ],
    [
      'missing lifecycle field',
      () => {
        const envelope: any = rotationEnvelope();
        envelope.data.attributes.lastUsedAt = undefined;
        return envelope;
      }
    ],
    [
      'empty replacement secret',
      () => {
        const envelope = rotationEnvelope();
        envelope.data.attributes.agentKey = '';
        return envelope;
      }
    ],
    [
      'invalid previous-key expiry',
      () => {
        const envelope = rotationEnvelope();
        envelope.data.attributes.previousKeyExpiresAt = 'tomorrow';
        return envelope;
      }
    ],
    [
      'missing agent relationship',
      () => {
        const envelope: any = rotationEnvelope();
        envelope.data.relationships.agent = undefined;
        return envelope;
      }
    ],
    [
      'wrong party relationship type',
      () => {
        const envelope = rotationEnvelope();
        envelope.data.relationships.party.data.type = 'agent';
        return envelope;
      }
    ]
  ])('rejects a malformed success response with %s', async (_label, response) => {
    naturalClientMocks.request.mockResolvedValueOnce(response());

    const error = await rotateAgentKey
      .handleInvocation(createCtx(validInput))
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;
    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/malformed success response/i);
    expect(error.message).toMatch(/verify.*before retrying/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });

  it('rejects a mismatched key resource with verify-before-retry guidance', async () => {
    naturalClientMocks.request.mockResolvedValueOnce(rotationEnvelope('agk_different-key'));

    const error = await rotateAgentKey
      .handleInvocation(createCtx(validInput))
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;
    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different agent key/i);
    expect(error.message).toMatch(/verify.*before retrying/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });
});
