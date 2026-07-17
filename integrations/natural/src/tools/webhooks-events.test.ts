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
  createWebhook,
  deleteWebhook,
  getEvent,
  getWebhook,
  listEvents,
  listWebhooks,
  rotateWebhookSecret,
  updateWebhook
} from './webhooks-events';

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

describe('Natural webhook and event list tools', () => {
  beforeEach(() => {
    naturalClientMocks.request.mockReset();
    NaturalClientMock.mockClear();
  });

  it('preserves full webhook resources from list webhooks', async () => {
    const webhook = {
      id: 'whk_0192abc1def2789034567890abcdef12',
      type: 'webhook',
      attributes: {
        url: 'https://example.com/webhooks/natural',
        description: 'Production webhook',
        status: 'ENABLED',
        enabledEvents: ['wallet.created', 'party.updated'],
        tags: {
          env: 'prod',
          team: 'payments'
        },
        createdAt: '2026-03-16T12:00:00Z',
        updatedAt: '2026-03-16T12:00:00Z'
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
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(webhook));

    const result = await listWebhooks.handleInvocation(
      createCtx({
        status: 'ENABLED',
        cursor: 'cur_123',
        limit: 25
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'list webhooks',
      'get',
      '/webhooks',
      {
        params: {
          status: 'ENABLED',
          cursor: 'cur_123',
          limit: 25
        }
      }
    );
    expect(result.output.webhooks).toEqual([webhook]);
  });

  it('validates documented create webhook event, wildcard, description, and tag constraints', () => {
    const validInput = {
      url: 'https://example.com/webhooks/natural',
      enabledEvents: ['compliance_case.updated'],
      description: 'Production webhook',
      tags: { team_1: 'payments' },
      idempotencyKey: '019cd344-4a7a-70ef-af55-4fd8450d221a'
    };

    expect(createWebhook.inputSchema.safeParse(validInput).success).toBe(true);
    expect(
      createWebhook.inputSchema.safeParse({
        ...validInput,
        idempotencyKey: undefined
      }).success
    ).toBe(false);
    expect(
      createWebhook.inputSchema.safeParse({
        ...validInput,
        enabledEvents: ['*']
      }).success
    ).toBe(true);
    expect(
      createWebhook.inputSchema.safeParse({
        ...validInput,
        enabledEvents: ['*', 'wallet.created']
      }).success
    ).toBe(false);
    expect(
      createWebhook.inputSchema.safeParse({
        ...validInput,
        enabledEvents: ['party.delegation_granted']
      }).success
    ).toBe(false);
    expect(
      createWebhook.inputSchema.safeParse({
        ...validInput,
        description: 'x'.repeat(501)
      }).success
    ).toBe(false);
    expect(
      createWebhook.inputSchema.safeParse({
        ...validInput,
        tags: { 'team-name': 'payments' }
      }).success
    ).toBe(false);
    expect(
      createWebhook.inputSchema.safeParse({
        ...validInput,
        tags: { team: '' }
      }).success
    ).toBe(false);
    expect(
      createWebhook.inputSchema.safeParse({
        ...validInput,
        tags: { ['x'.repeat(129)]: 'payments' }
      }).success
    ).toBe(false);
    expect(
      createWebhook.inputSchema.safeParse({
        ...validInput,
        tags: { team: 'x'.repeat(257) }
      }).success
    ).toBe(false);
  });

  it('creates a JSON:API webhook with idempotency and exposes metadata with one secret copy', async () => {
    const webhookId = 'whk_0192abc1def2789034567890abcdef12';
    const partyId = 'pty_7c9e6679e29b41d4a716446655440001';
    const signingSecret = 'whsec_3JZ8aQpL2vR7nXdE5fW1cT0yK6mB4hG9';
    const rootSigningSecret = 'whsec_root_level_canary_must_not_escape';
    const attributes = {
      url: 'https://example.com/webhooks/natural',
      description: 'Production webhook',
      status: 'ENABLED',
      enabledEvents: ['wallet.created', 'party.updated'],
      tags: {
        env: 'prod',
        team: 'payments'
      },
      createdAt: '2026-03-16T12:00:00Z',
      updatedAt: '2026-03-16T12:00:00Z',
      signingSecret,
      futureWebhookField: 'preserved'
    };
    const relationships = {
      party: {
        data: {
          type: 'party',
          id: partyId
        }
      },
      futureRelationship: {
        data: {
          type: 'future',
          id: 'future_123'
        }
      }
    };
    const webhook = {
      id: webhookId,
      type: 'webhook',
      signingSecret: rootSigningSecret,
      attributes,
      relationships
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: webhook });

    const result = await createWebhook.handleInvocation(
      createCtx({
        url: attributes.url,
        enabledEvents: attributes.enabledEvents,
        description: attributes.description,
        tags: attributes.tags,
        idempotencyKey: '019cd344-4a7a-70ef-af55-4fd8450d221a'
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'create webhook',
      'post',
      '/webhooks',
      {
        idempotencyKey: '019cd344-4a7a-70ef-af55-4fd8450d221a',
        body: {
          data: {
            attributes: {
              url: attributes.url,
              enabledEvents: attributes.enabledEvents,
              description: attributes.description,
              tags: attributes.tags
            }
          }
        }
      }
    );
    expect(createWebhook.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      webhookId,
      type: 'webhook',
      url: attributes.url,
      description: attributes.description,
      status: attributes.status,
      enabledEvents: attributes.enabledEvents,
      tags: attributes.tags,
      createdAt: attributes.createdAt,
      updatedAt: attributes.updatedAt,
      partyId,
      relationships,
      signingSecret,
      webhook: {
        id: webhookId,
        type: 'webhook',
        attributes: {
          url: attributes.url,
          description: attributes.description,
          status: attributes.status,
          enabledEvents: attributes.enabledEvents,
          tags: attributes.tags,
          createdAt: attributes.createdAt,
          updatedAt: attributes.updatedAt,
          futureWebhookField: attributes.futureWebhookField
        },
        relationships
      }
    });
    const serializedOutput = JSON.stringify(result.output);
    expect(serializedOutput).not.toContain(rootSigningSecret);
    expect(serializedOutput.split(signingSecret)).toHaveLength(2);
  });

  it('accepts opaque Natural webhook IDs with a nonempty whk_ prefix', () => {
    for (const webhookId of [
      'whk_0192abc1def2789034567890abcdef12',
      'whk_0192ABC1def2789034567890abcdef12',
      'whk_future-format.v2'
    ]) {
      expect(getWebhook.inputSchema.safeParse({ webhookId }).success).toBe(true);
    }

    for (const webhookId of ['evt_0192abc1def2789034567890abcdef12', 'whk_', 'whk']) {
      expect(getWebhook.inputSchema.safeParse({ webhookId }).success).toBe(false);
    }
  });

  it('encodes an opaque webhook ID into one request path segment', async () => {
    const webhookId = 'whk_future/format?revision=2#current';
    naturalClientMocks.request.mockResolvedValueOnce({
      data: {
        id: webhookId,
        type: 'webhook',
        attributes: {}
      }
    });

    await getWebhook.handleInvocation(createCtx({ webhookId }));

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'get webhook',
      'get',
      '/webhooks/whk_future%2Fformat%3Frevision%3D2%23current'
    );
  });

  it('gets a webhook without a body, exposes documented metadata, and never returns its secret', async () => {
    const webhookId = 'whk_0192abc1def2789034567890abcdef12';
    const partyId = 'pty_7c9e6679e29b41d4a716446655440001';
    const webhook = {
      id: webhookId,
      type: 'webhook',
      attributes: {
        url: 'https://example.com/webhooks/natural',
        description: 'Production webhook',
        status: 'ENABLED',
        enabledEvents: ['wallet.created', 'future.event'],
        tags: {
          env: 'prod',
          team: 'payments'
        },
        createdAt: '2026-03-16T12:00:00Z',
        updatedAt: '2026-03-16T12:01:00Z',
        futureWebhookField: 'preserved',
        signingSecret: 'whsec_must_not_escape'
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: partyId
          }
        },
        futureRelationship: {
          data: {
            type: 'future',
            id: 'future_123'
          }
        }
      }
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: webhook });

    const result = await getWebhook.handleInvocation(createCtx({ webhookId }));

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'get webhook',
      'get',
      `/webhooks/${webhookId}`
    );
    expect(getWebhook.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      webhookId,
      type: 'webhook',
      url: webhook.attributes.url,
      description: webhook.attributes.description,
      status: webhook.attributes.status,
      enabledEvents: webhook.attributes.enabledEvents,
      tags: webhook.attributes.tags,
      createdAt: webhook.attributes.createdAt,
      updatedAt: webhook.attributes.updatedAt,
      partyId,
      relationships: webhook.relationships,
      webhook: {
        ...webhook,
        attributes: {
          url: webhook.attributes.url,
          description: webhook.attributes.description,
          status: webhook.attributes.status,
          enabledEvents: webhook.attributes.enabledEvents,
          tags: webhook.attributes.tags,
          createdAt: webhook.attributes.createdAt,
          updatedAt: webhook.attributes.updatedAt,
          futureWebhookField: 'preserved'
        }
      }
    });
    expect(JSON.stringify(result.output)).not.toContain('whsec_must_not_escape');
    expect(result.output).not.toHaveProperty('signingSecret');
  });

  it('validates documented update webhook IDs, events, tag updates, and non-empty bodies', async () => {
    const validInput = {
      webhookId: 'whk_0192abc1def2789034567890abcdef12',
      enabledEvents: ['compliance_case.updated'],
      tags: { team_1: 'payments', remove_me: null },
      idempotencyKey: '019cd344-4a7a-70ef-af55-4fd8450d221a'
    };

    expect(updateWebhook.inputSchema.safeParse(validInput).success).toBe(true);
    expect(
      updateWebhook.inputSchema.safeParse({ ...validInput, enabledEvents: ['*'] }).success
    ).toBe(true);
    for (const webhookId of [
      'whk_0192ABC1def2789034567890abcdef12',
      'whk_future/format?revision=2#current'
    ]) {
      expect(updateWebhook.inputSchema.safeParse({ ...validInput, webhookId }).success).toBe(
        true
      );
    }
    for (const webhookId of [
      'evt_0192abc1def2789034567890abcdef12',
      'whk_',
      'whk',
      `whk_${String.fromCharCode(0xd800)}`
    ]) {
      expect(updateWebhook.inputSchema.safeParse({ ...validInput, webhookId }).success).toBe(
        false
      );
    }
    expect(
      updateWebhook.inputSchema.safeParse({
        ...validInput,
        enabledEvents: ['*', 'wallet.created']
      }).success
    ).toBe(false);
    expect(
      updateWebhook.inputSchema.safeParse({
        ...validInput,
        enabledEvents: ['party.delegation_granted']
      }).success
    ).toBe(true);
    expect(
      updateWebhook.inputSchema.safeParse({ ...validInput, enabledEvents: [] }).success
    ).toBe(false);
    expect(
      updateWebhook.inputSchema.safeParse({
        ...validInput,
        tags: {
          'legacy-team-name': '',
          ['x'.repeat(129)]: 'x'.repeat(257),
          remove_me: null
        }
      }).success
    ).toBe(true);

    await expect(
      updateWebhook.handleInvocation(
        createCtx({
          webhookId: validInput.webhookId,
          idempotencyKey: validInput.idempotencyKey
        })
      )
    ).rejects.toThrow(/at least one webhook update field/i);
    expect(naturalClientMocks.request).not.toHaveBeenCalled();
  });

  it('updates with PATCH, an encoded opaque ID, JSON:API, and normalized tag removals', async () => {
    const webhookId = 'whk_future/format?revision=2#current';
    const partyId = 'pty_7c9e6679e29b41d4a716446655440001';
    const attributes = {
      url: 'https://example.com/webhooks/natural-v2',
      description: 'Updated production webhook',
      status: 'DISABLED',
      enabledEvents: ['wallet.created', 'party.updated'],
      tags: { env: 'staging' },
      createdAt: '2026-03-16T12:00:00Z',
      updatedAt: '2026-03-17T08:15:00Z',
      futureWebhookField: 'preserved',
      signingSecret: 'whsec_must_not_escape'
    };
    const relationships = {
      party: {
        data: {
          type: 'party',
          id: partyId
        }
      },
      futureRelationship: {
        data: {
          type: 'future',
          id: 'future_123'
        }
      }
    };
    const webhook = {
      id: webhookId,
      type: 'webhook',
      signingSecret: 'whsec_root_must_not_escape',
      attributes,
      relationships,
      futureResourceField: 'preserved'
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: webhook });

    const result = await updateWebhook.handleInvocation(
      createCtx({
        webhookId,
        description: attributes.description,
        status: attributes.status,
        enabledEvents: attributes.enabledEvents,
        tags: { env: 'staging', legacy_team: '', team: null },
        idempotencyKey: '019cd344-4a7a-70ef-af55-4fd8450d221a'
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'update webhook',
      'patch',
      '/webhooks/whk_future%2Fformat%3Frevision%3D2%23current',
      {
        idempotencyKey: '019cd344-4a7a-70ef-af55-4fd8450d221a',
        body: {
          data: {
            attributes: {
              description: attributes.description,
              status: attributes.status,
              enabledEvents: attributes.enabledEvents,
              tags: { env: 'staging', legacy_team: null, team: null }
            }
          }
        }
      }
    );
    expect(updateWebhook.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      webhookId,
      type: 'webhook',
      url: attributes.url,
      description: attributes.description,
      status: attributes.status,
      enabledEvents: attributes.enabledEvents,
      tags: attributes.tags,
      createdAt: attributes.createdAt,
      updatedAt: attributes.updatedAt,
      partyId,
      relationships,
      webhook: {
        id: webhookId,
        type: 'webhook',
        attributes: {
          url: attributes.url,
          description: attributes.description,
          status: attributes.status,
          enabledEvents: attributes.enabledEvents,
          tags: attributes.tags,
          createdAt: attributes.createdAt,
          updatedAt: attributes.updatedAt,
          futureWebhookField: attributes.futureWebhookField
        },
        relationships,
        futureResourceField: 'preserved'
      }
    });
    const serializedOutput = JSON.stringify(result.output);
    expect(serializedOutput).not.toContain('whsec_must_not_escape');
    expect(serializedOutput).not.toContain('whsec_root_must_not_escape');
    expect(result.output).not.toHaveProperty('signingSecret');
    expect(result.message).not.toContain('whsec_must_not_escape');
  });

  it('validates and confirms destructive webhook deletion before calling Natural', async () => {
    const validInput = {
      webhookId: 'whk_0192abc1def2789034567890abcdef12',
      idempotencyKey: 'delete-webhook-1',
      confirm: true
    };

    for (const webhookId of [
      validInput.webhookId,
      'whk_0192ABC1def2789034567890abcdef12',
      'whk_future/format?revision=2#current',
      'whk_opaque-🚀'
    ]) {
      expect(deleteWebhook.inputSchema.safeParse({ ...validInput, webhookId }).success).toBe(
        true
      );
    }
    for (const webhookId of [
      'evt_0192abc1def2789034567890abcdef12',
      'whk_',
      'whk',
      `whk_${String.fromCharCode(0xd800)}`
    ]) {
      expect(deleteWebhook.inputSchema.safeParse({ ...validInput, webhookId }).success).toBe(
        false
      );
    }
    expect(deleteWebhook.tags).toMatchObject({ destructive: true });

    await expect(
      deleteWebhook.handleInvocation(createCtx({ ...validInput, confirm: false }))
    ).rejects.toThrow(/confirm/i);
    await expect(
      deleteWebhook.handleInvocation(createCtx({ ...validInput, idempotencyKey: undefined }))
    ).rejects.toThrow(/idempotencyKey/i);
    expect(naturalClientMocks.request).not.toHaveBeenCalled();
  });

  it('deletes an encoded opaque ID without a body and preserves non-secret additive data', async () => {
    const webhookId = 'whk_future/format?revision=2#current';
    const rootSigningSecret = 'whsec_root_must_not_escape';
    const attributeSigningSecret = 'whsec_attribute_must_not_escape';
    const webhook = {
      id: webhookId,
      type: 'webhook',
      signingSecret: rootSigningSecret,
      attributes: {
        url: 'https://example.com/webhooks/natural',
        description: 'Production webhook',
        status: 'FUTURE_STATUS',
        enabledEvents: ['wallet.created'],
        tags: { env: 'prod' },
        createdAt: '2026-03-16T12:00:00Z',
        updatedAt: '2026-03-17T08:15:00Z',
        signingSecret: attributeSigningSecret,
        futureWebhookField: 'preserved'
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: 'pty_7c9e6679e29b41d4a716446655440001'
          }
        }
      },
      futureResourceField: 'preserved'
    };
    const meta = {
      deleted: true,
      futureMetaField: 'preserved'
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: webhook, meta });

    const result = await deleteWebhook.handleInvocation(
      createCtx({ webhookId, idempotencyKey: 'delete-webhook-1', confirm: true })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'delete webhook',
      'delete',
      '/webhooks/whk_future%2Fformat%3Frevision%3D2%23current',
      { idempotencyKey: 'delete-webhook-1' }
    );
    expect(deleteWebhook.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      webhookId,
      type: 'webhook',
      status: 'FUTURE_STATUS',
      webhook: {
        id: webhookId,
        type: 'webhook',
        attributes: {
          url: webhook.attributes.url,
          description: webhook.attributes.description,
          status: webhook.attributes.status,
          enabledEvents: webhook.attributes.enabledEvents,
          tags: webhook.attributes.tags,
          createdAt: webhook.attributes.createdAt,
          updatedAt: webhook.attributes.updatedAt,
          futureWebhookField: webhook.attributes.futureWebhookField
        },
        relationships: webhook.relationships,
        futureResourceField: webhook.futureResourceField
      },
      deleted: true,
      meta
    });
    const serializedOutput = JSON.stringify(result.output);
    expect(serializedOutput).not.toContain(rootSigningSecret);
    expect(serializedOutput).not.toContain(attributeSigningSecret);
    expect(result.message).not.toContain(rootSigningSecret);
    expect(result.message).not.toContain(attributeSigningSecret);
  });

  it('rejects malformed webhook deletion success responses with same-key retry guidance', async () => {
    const webhookId = 'whk_requested';
    const valid = {
      data: {
        type: 'webhook',
        id: webhookId,
        attributes: { status: 'ENABLED' }
      },
      meta: { deleted: true }
    };
    const malformedResponses: [string, unknown][] = [
      ['missing data', { meta: valid.meta }],
      ['wrong resource type', { ...valid, data: { ...valid.data, type: 'event' } }],
      [
        'missing status',
        { ...valid, data: { ...valid.data, attributes: { futureAttribute: true } } }
      ],
      ['missing metadata', { data: valid.data }],
      ['unconfirmed deletion', { ...valid, meta: { deleted: false } }]
    ];

    for (const [label, response] of malformedResponses) {
      naturalClientMocks.request.mockResolvedValueOnce(response);

      const error = await deleteWebhook
        .handleInvocation(
          createCtx({ webhookId, idempotencyKey: 'delete-webhook-malformed', confirm: true })
        )
        .catch((caught: unknown) => caught);

      expect(error, label).toBeInstanceOf(ServiceError);
      if (!(error instanceof ServiceError)) continue;
      expect(error.data.reason, label).toBe('natural_response_error');
      expect(error.message, label).toMatch(/malformed success response/i);
      expect(error.message, label).toMatch(/same idempotency key/i);
    }
  });

  it('rejects a mismatched webhook deletion response with same-key retry guidance', async () => {
    naturalClientMocks.request.mockResolvedValueOnce({
      data: {
        type: 'webhook',
        id: 'whk_different',
        attributes: { status: 'DISABLED' }
      },
      meta: { deleted: true }
    });

    const error = await deleteWebhook
      .handleInvocation(
        createCtx({
          webhookId: 'whk_requested',
          idempotencyKey: 'delete-webhook-mismatch',
          confirm: true
        })
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;
    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different webhook/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });

  it('validates and confirms destructive webhook secret rotation before calling Natural', async () => {
    const validInput = {
      webhookId: 'whk_0192abc1def2789034567890abcdef12',
      expiresInSeconds: 3600,
      idempotencyKey: 'rotate-webhook-secret-1',
      confirm: true
    };

    expect(rotateWebhookSecret.inputSchema.safeParse(validInput).success).toBe(true);
    for (const webhookId of [
      'whk_0192ABC1def2789034567890abcdef12',
      'whk_future/format?revision=2#current',
      'whk_opaque-🚀'
    ]) {
      expect(
        rotateWebhookSecret.inputSchema.safeParse({ ...validInput, webhookId }).success
      ).toBe(true);
    }
    for (const webhookId of [
      'evt_0192abc1def2789034567890abcdef12',
      'whk_',
      'whk',
      'whk_future\uD800',
      'whk_future\uDC00'
    ]) {
      expect(
        rotateWebhookSecret.inputSchema.safeParse({ ...validInput, webhookId }).success
      ).toBe(false);
    }
    expect(
      rotateWebhookSecret.inputSchema.safeParse({ ...validInput, expiresInSeconds: -1 })
        .success
    ).toBe(false);
    expect(
      rotateWebhookSecret.inputSchema.safeParse({ ...validInput, expiresInSeconds: 86401 })
        .success
    ).toBe(false);
    expect(rotateWebhookSecret.tags).toMatchObject({ destructive: true });

    await expect(
      rotateWebhookSecret.handleInvocation(createCtx({ ...validInput, confirm: false }))
    ).rejects.toThrow(/confirm/i);
    await expect(
      rotateWebhookSecret.handleInvocation(
        createCtx({ ...validInput, idempotencyKey: undefined })
      )
    ).rejects.toThrow(/idempotencyKey/i);
    expect(naturalClientMocks.request).not.toHaveBeenCalled();
  });

  it('rotates with JSON:API and idempotency, returning one secret copy plus ownership metadata', async () => {
    const webhookId = 'whk_future/format?revision=2#current';
    const partyId = 'pty_7c9e6679e29b41d4a716446655440001';
    const signingSecret = 'whsec_7Yp2KdN9wL4xT8rE1cV5bM0aQ6hJ3fG8';
    const rootSigningSecret = 'whsec_root_level_canary_must_not_escape';
    const previousSecretExpiresAt = '2026-03-17T09:15:00Z';
    const relationships = {
      party: {
        data: {
          type: 'party',
          id: partyId
        }
      },
      futureRelationship: {
        data: {
          type: 'future',
          id: 'future_123'
        }
      }
    };
    const webhook = {
      id: webhookId,
      type: 'webhook',
      signingSecret: rootSigningSecret,
      attributes: {
        signingSecret,
        previousSecretExpiresAt,
        futureRotationField: 'preserved'
      },
      relationships,
      futureResourceField: 'preserved'
    };
    naturalClientMocks.request.mockResolvedValueOnce({ data: webhook });

    const result = await rotateWebhookSecret.handleInvocation(
      createCtx({
        webhookId,
        expiresInSeconds: 3600,
        idempotencyKey: 'rotate-webhook-secret-1',
        confirm: true
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'rotate webhook secret',
      'post',
      '/webhooks/whk_future%2Fformat%3Frevision%3D2%23current/rotate-secret',
      {
        idempotencyKey: 'rotate-webhook-secret-1',
        body: {
          data: {
            attributes: {
              expiresInSeconds: 3600
            }
          }
        }
      }
    );
    expect(rotateWebhookSecret.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      webhookId,
      type: 'webhook',
      partyId,
      relationships,
      signingSecret,
      previousSecretExpiresAt,
      webhook: {
        id: webhookId,
        type: 'webhook',
        attributes: {
          previousSecretExpiresAt,
          futureRotationField: 'preserved'
        },
        relationships,
        futureResourceField: 'preserved'
      }
    });
    const serializedOutput = JSON.stringify(result.output);
    expect(serializedOutput).not.toContain(rootSigningSecret);
    expect(serializedOutput.split(signingSecret)).toHaveLength(2);
    expect(result.output.webhook.attributes).not.toHaveProperty('signingSecret');
    expect(result.output.webhook).not.toHaveProperty('signingSecret');
    expect(result.message).not.toContain(signingSecret);
  });

  it('preserves a null previous-secret expiry for immediate cutover', async () => {
    const webhookId = 'whk_immediate-cutover';
    naturalClientMocks.request.mockResolvedValueOnce({
      data: {
        id: webhookId,
        type: 'webhook',
        attributes: {
          signingSecret: 'whsec_immediate',
          previousSecretExpiresAt: null
        },
        relationships: {
          party: { data: { type: 'party', id: 'pty_owner' } }
        }
      }
    });

    const result = await rotateWebhookSecret.handleInvocation(
      createCtx({
        webhookId,
        expiresInSeconds: 0,
        idempotencyKey: 'rotate-webhook-secret-immediate',
        confirm: true
      })
    );

    expect(result.output.previousSecretExpiresAt).toBeNull();
    expect(rotateWebhookSecret.outputSchema.parse(result.output)).toEqual(result.output);
  });

  it.each([
    ['missing data', {}],
    [
      'wrong resource type',
      {
        data: {
          id: 'whk_0192abc1def2789034567890abcdef12',
          type: 'event',
          attributes: {
            signingSecret: 'whsec_new',
            previousSecretExpiresAt: null
          },
          relationships: {
            party: { data: { type: 'party', id: 'pty_owner' } }
          }
        }
      }
    ],
    [
      'empty signing secret',
      {
        data: {
          id: 'whk_0192abc1def2789034567890abcdef12',
          type: 'webhook',
          attributes: { signingSecret: '', previousSecretExpiresAt: null },
          relationships: {
            party: { data: { type: 'party', id: 'pty_owner' } }
          }
        }
      }
    ],
    [
      'invalid previous-secret expiry',
      {
        data: {
          id: 'whk_0192abc1def2789034567890abcdef12',
          type: 'webhook',
          attributes: {
            signingSecret: 'whsec_new',
            previousSecretExpiresAt: 'tomorrow'
          },
          relationships: {
            party: { data: { type: 'party', id: 'pty_owner' } }
          }
        }
      }
    ],
    [
      'missing party relationship',
      {
        data: {
          id: 'whk_0192abc1def2789034567890abcdef12',
          type: 'webhook',
          attributes: {
            signingSecret: 'whsec_new',
            previousSecretExpiresAt: null
          },
          relationships: {}
        }
      }
    ],
    [
      'wrong party relationship type',
      {
        data: {
          id: 'whk_0192abc1def2789034567890abcdef12',
          type: 'webhook',
          attributes: {
            signingSecret: 'whsec_new',
            previousSecretExpiresAt: null
          },
          relationships: {
            party: { data: { type: 'agent', id: 'agt_owner' } }
          }
        }
      }
    ]
  ])('rejects a malformed rotate-secret success response with %s', async (_case, response) => {
    naturalClientMocks.request.mockResolvedValueOnce(response);

    const error = await rotateWebhookSecret
      .handleInvocation(
        createCtx({
          webhookId: 'whk_0192abc1def2789034567890abcdef12',
          expiresInSeconds: 3600,
          idempotencyKey: 'rotate-webhook-secret-malformed',
          confirm: true
        })
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/malformed success response/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });

  it('rejects a mismatched rotate-secret resource with same-key retry guidance', async () => {
    naturalClientMocks.request.mockResolvedValueOnce({
      data: {
        id: 'whk_different-webhook',
        type: 'webhook',
        attributes: {
          signingSecret: 'whsec_new',
          previousSecretExpiresAt: null
        },
        relationships: {
          party: { data: { type: 'party', id: 'pty_owner' } }
        }
      }
    });

    const error = await rotateWebhookSecret
      .handleInvocation(
        createCtx({
          webhookId: 'whk_0192abc1def2789034567890abcdef12',
          expiresInSeconds: 0,
          idempotencyKey: 'rotate-webhook-secret-mismatch',
          confirm: true
        })
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceError);
    if (!(error instanceof ServiceError)) return;

    expect(error.data.reason).toBe('natural_response_error');
    expect(error.message).toMatch(/different webhook/i);
    expect(error.message).toMatch(/same idempotency key/i);
  });

  it('validates documented list event filters', () => {
    const validInput = {
      partyId: 'pty_future-format.v2',
      eventType: 'compliance_case.updated',
      createdAfter: '2026-03-01T00:00:00Z',
      createdBefore: '2026-04-01T02:00:00+02:00',
      cursor: 'opaque-cursor',
      limit: 100
    };

    expect(listEvents.inputSchema.safeParse(validInput).success).toBe(true);
    expect(
      listEvents.inputSchema.safeParse({
        ...validInput,
        eventType: 'party.delegation_granted'
      }).success
    ).toBe(true);
    expect(
      listEvents.inputSchema.safeParse({ ...validInput, partyId: 'not-a-party-id' }).success
    ).toBe(false);
    expect(listEvents.inputSchema.safeParse({ ...validInput, partyId: 'pty_' }).success).toBe(
      false
    );
    expect(
      listEvents.inputSchema.safeParse({ ...validInput, createdAfter: 'yesterday' }).success
    ).toBe(false);
    expect(
      listEvents.inputSchema.safeParse({ ...validInput, createdBefore: '2026-04-01' }).success
    ).toBe(false);
    expect(listEvents.inputSchema.safeParse({ ...validInput, limit: 0 }).success).toBe(false);
    expect(listEvents.inputSchema.safeParse({ ...validInput, limit: 101 }).success).toBe(
      false
    );
  });

  it('sends documented filters and exposes stable event fields plus raw metadata', async () => {
    const partyId = 'pty_future/format?revision=2#current&scope=all';
    const event = {
      id: 'evt_0192abc1def2789034567890abcdef12',
      type: 'event',
      attributes: {
        eventType: 'wallet.created',
        resourceId: 'wal_7c9e6679e29b41d4a716446655440001',
        resourceType: 'wallet',
        payload: {
          object: {
            displayName: 'Operating',
            status: 'active'
          }
        },
        createdAt: '2026-03-16T12:00:00Z'
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: partyId
          }
        },
        futureRelationship: {
          data: {
            type: 'future',
            id: 'future_123'
          }
        }
      },
      futureEventField: 'preserved'
    };
    naturalClientMocks.request.mockResolvedValueOnce(paginatedEnvelope(event));

    const result = await listEvents.handleInvocation(
      createCtx({
        partyId,
        eventType: 'wallet.created',
        createdAfter: '2026-03-01T00:00:00Z',
        createdBefore: '2026-04-01T00:00:00Z',
        cursor: 'cur_456',
        limit: 10
      })
    );

    expect(naturalClientMocks.request).toHaveBeenCalledWith('list events', 'get', '/events', {
      params: {
        partyId,
        eventType: 'wallet.created',
        createdAfter: '2026-03-01T00:00:00Z',
        createdBefore: '2026-04-01T00:00:00Z',
        cursor: 'cur_456',
        limit: 10
      }
    });
    expect(listEvents.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      events: [
        {
          ...event,
          eventId: event.id,
          type: event.type,
          eventType: event.attributes.eventType,
          resourceId: event.attributes.resourceId,
          resourceType: event.attributes.resourceType,
          payload: event.attributes.payload,
          object: event.attributes.payload.object,
          createdAt: event.attributes.createdAt,
          partyId,
          relationships: event.relationships,
          event
        }
      ],
      pagination: {
        hasMore: false,
        nextCursor: null
      }
    });
  });

  it('gets an event without a body and exposes its payload, party, timestamp, and raw metadata', async () => {
    const eventId = 'evt_0192abc1def2789034567890abcdef12';
    const partyId = 'pty_7c9e6679e29b41d4a716446655440001';
    const event = {
      id: eventId,
      type: 'event',
      attributes: {
        eventType: 'wallet.created',
        resourceId: 'wal_7c9e6679e29b41d4a716446655440001',
        resourceType: 'wallet',
        payload: {
          object: {
            displayName: 'Operating',
            status: 'active'
          },
          futurePayloadField: 'preserved'
        },
        createdAt: '2026-03-16T12:00:00Z',
        futureAttribute: 'preserved'
      },
      relationships: {
        party: {
          data: {
            type: 'party',
            id: partyId
          }
        },
        futureRelationship: {
          data: {
            type: 'future',
            id: 'future_123'
          }
        }
      },
      futureEventField: 'preserved'
    };

    expect(getEvent.inputSchema.safeParse({ eventId, partyId }).success).toBe(true);
    for (const invalidEventId of [
      'whk_0192abc1def2789034567890abcdef12',
      'evt_0192ABC1def2789034567890abcdef12',
      'evt_invalid'
    ]) {
      expect(
        getEvent.inputSchema.safeParse({ eventId: invalidEventId, partyId }).success
      ).toBe(false);
    }
    expect(getEvent.inputSchema.safeParse({ eventId, partyId: 'pty_invalid' }).success).toBe(
      false
    );

    naturalClientMocks.request.mockResolvedValueOnce({ data: event });

    const result = await getEvent.handleInvocation(createCtx({ eventId, partyId }));

    expect(naturalClientMocks.request).toHaveBeenCalledWith(
      'get event',
      'get',
      `/events/${eventId}`,
      { params: { partyId } }
    );
    expect(getEvent.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      eventId,
      type: event.type,
      eventType: event.attributes.eventType,
      resourceId: event.attributes.resourceId,
      resourceType: event.attributes.resourceType,
      payload: event.attributes.payload,
      object: event.attributes.payload.object,
      createdAt: event.attributes.createdAt,
      partyId,
      relationships: event.relationships,
      event
    });
  });
});
