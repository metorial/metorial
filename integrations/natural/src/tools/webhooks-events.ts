import { SlateTool } from 'slates';
import { z } from 'zod';
import { attributesOf, jsonApiBody, singleData } from '../lib/envelopes';
import { naturalServiceError } from '../lib/errors';
import { paginationInputFields } from '../lib/pagination';
import {
  ensureAtLeastOneField,
  requireConfirm,
  requireIdempotencyKey
} from '../lib/validation';
import { spec } from '../spec';
import {
  confirmSchema,
  idempotencyKeySchema,
  rawRecordArraySchema,
  rawRecordSchema
} from './schemas';
import {
  attributesBody,
  countOf,
  createClient,
  listRawResult,
  resourceResult,
  summaryListMessage
} from './shared';

const naturalEventTypes = [
  'party.updated',
  'party.delegation_granted',
  'wallet.created',
  'external_account.connected',
  'agent_delegation_invitation.created',
  'agent_delegation_invitation.accepted',
  'agent_delegation_invitation.declined',
  'agent_delegation_invitation.canceled',
  'agent_delegation.revoked',
  'delegation.activated',
  'delegation.revoked',
  'deposit.created',
  'deposit.completed',
  'deposit.failed',
  'deposit.returned',
  'deposit.canceled',
  'deposit.approval_denied',
  'withdrawal.created',
  'withdrawal.completed',
  'withdrawal.failed',
  'withdrawal.returned',
  'withdrawal.canceled',
  'withdrawal.approval_denied',
  'payment.created',
  'payment.completed',
  'payment.failed',
  'payment.returned',
  'payment.canceled',
  'payment.approval_denied',
  'approval.required',
  'approval.approved',
  'approval.denied',
  'approval.canceled',
  'payment_request.created',
  'payment_request.completed',
  'payment_request.canceled',
  'payment_request.declined',
  'payment_request.incoming'
] as const;

const webhookEventSchema = z.enum(['*', ...naturalEventTypes]);
const eventTypeSchema = z.enum(naturalEventTypes);

const webhookOutput = (envelope: unknown, includeSecret = false) => {
  const base = resourceResult(envelope, 'webhookId', 'webhook');
  const attributes = attributesOf(singleData(envelope));

  return {
    ...base,
    signingSecret:
      includeSecret && typeof attributes.signingSecret === 'string'
        ? attributes.signingSecret
        : undefined,
    previousSecretExpiresAt:
      includeSecret && typeof attributes.previousSecretExpiresAt === 'string'
        ? attributes.previousSecretExpiresAt
        : null
  };
};

const webhookOutputSchema = z.object({
  webhookId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  signingSecret: z.string().optional(),
  previousSecretExpiresAt: z.string().nullable().optional(),
  webhook: rawRecordSchema
});

export const listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: 'List Natural webhooks with optional status filtering.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      status: z.enum(['ENABLED', 'DISABLED']).optional().describe('Webhook status filter.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      webhooks: rawRecordArraySchema,
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('list webhooks', 'get', '/webhooks', {
      params: {
        status: ctx.input.status,
        cursor: ctx.input.cursor,
        limit: ctx.input.limit
      }
    });
    const output = listRawResult(envelope, 'webhooks');

    return {
      output,
      message: summaryListMessage(countOf(output, 'webhooks'), 'webhooks')
    };
  })
  .build();

export const createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description:
    'Create a Natural webhook, return its delivery and ownership metadata, and expose the one-time signing secret only in output.signingSecret.',
  constraints: [
    'The webhook signing secret is returned only once at creation time.',
    'Use "*" as the only enabledEvents entry when subscribing to all events.'
  ]
})
  .input(
    z.object({
      url: z.string().url().describe('Webhook endpoint URL.'),
      enabledEvents: z
        .array(
          z.enum([
            '*',
            'compliance_case.updated',
            ...naturalEventTypes.filter(event => event !== 'party.delegation_granted')
          ])
        )
        .min(1)
        .superRefine((events, ctx) => {
          if (events.includes('*') && events.length !== 1) {
            ctx.addIssue({
              code: 'custom',
              message: 'Use "*" as the only enabledEvents entry.'
            });
          }
        })
        .describe(
          'Natural event types this webhook should receive. Use "*" by itself to subscribe to all events.'
        ),
      description: z.string().max(500).optional().describe('Webhook description.'),
      tags: z
        .record(
          z
            .string()
            .min(1)
            .max(128)
            .regex(/^[a-zA-Z0-9_]+$/),
          z.string().min(1).max(256)
        )
        .optional()
        .describe(
          'Optional non-sensitive metadata. Keys use letters, numbers, and underscores; values are 1-256 characters.'
        ),
      idempotencyKey: idempotencyKeySchema
    })
  )
  .output(
    z.object({
      webhookId: z.string().optional(),
      type: z.string().optional(),
      url: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      enabledEvents: z.array(z.string()).optional(),
      tags: z.record(z.string(), z.string()).optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      partyId: z.string().optional(),
      relationships: rawRecordSchema.optional(),
      signingSecret: z.string().optional(),
      webhook: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    requireIdempotencyKey(ctx.input.idempotencyKey, 'create a webhook');
    const client = createClient(ctx);
    const envelope = await client.request('create webhook', 'post', '/webhooks', {
      idempotencyKey: ctx.input.idempotencyKey,
      body: jsonApiBody(
        attributesBody({
          url: ctx.input.url,
          enabledEvents: ctx.input.enabledEvents,
          description: ctx.input.description,
          tags: ctx.input.tags
        })
      )
    });
    const result = resourceResult(envelope, 'webhookId', 'webhook');
    const attributes = attributesOf(result.webhook);
    const rawRelationships = result.webhook.relationships;
    const relationships =
      typeof rawRelationships === 'object' &&
      rawRelationships !== null &&
      !Array.isArray(rawRelationships)
        ? rawRelationships
        : undefined;
    const party = relationships?.party?.data;
    const tags =
      typeof attributes.tags === 'object' &&
      attributes.tags !== null &&
      !Array.isArray(attributes.tags)
        ? attributes.tags
        : undefined;
    const safeAttributes = Object.fromEntries(
      Object.entries(attributes).filter(([key]) => key !== 'signingSecret')
    );
    const safeWebhook = Object.fromEntries(
      Object.entries(result.webhook).filter(([key]) => key !== 'signingSecret')
    );
    const signingSecret =
      typeof attributes.signingSecret === 'string'
        ? attributes.signingSecret
        : typeof result.webhook.signingSecret === 'string'
          ? result.webhook.signingSecret
          : undefined;

    return {
      output: {
        webhookId: result.webhookId,
        type: result.type,
        url: typeof attributes.url === 'string' ? attributes.url : undefined,
        description:
          typeof attributes.description === 'string' ? attributes.description : undefined,
        status: result.status,
        enabledEvents: Array.isArray(attributes.enabledEvents)
          ? attributes.enabledEvents.filter(event => typeof event === 'string')
          : undefined,
        tags,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        updatedAt: typeof attributes.updatedAt === 'string' ? attributes.updatedAt : undefined,
        partyId: typeof party?.id === 'string' ? party.id : undefined,
        relationships,
        signingSecret,
        webhook: {
          ...safeWebhook,
          attributes: safeAttributes
        }
      },
      message: `Created webhook for **${ctx.input.url}**. Store the returned signing secret securely.`
    };
  })
  .build();

export const getWebhook = SlateTool.create(spec, {
  name: 'Get Webhook',
  key: 'get_webhook',
  description:
    'Retrieve a Natural webhook by ID, including its delivery URL, status, subscribed events, tags, timestamps, and owning party. Signing secrets are never returned.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      webhookId: z
        .string()
        .regex(/^whk_.+$/)
        .describe('Natural webhook ID with the whk_ prefix and a nonempty opaque suffix.')
    })
  )
  .output(
    z.object({
      webhookId: z.string().optional(),
      type: z.string().optional(),
      url: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      enabledEvents: z.array(z.string()).optional(),
      tags: z.record(z.string(), z.string()).optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      partyId: z.string().optional(),
      relationships: rawRecordSchema.optional(),
      webhook: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get webhook',
      'get',
      `/webhooks/${encodeURIComponent(ctx.input.webhookId)}`
    );
    const result = resourceResult(envelope, 'webhookId', 'webhook');
    const attributes = attributesOf(result.webhook);
    const safeAttributes = Object.fromEntries(
      Object.entries(attributes).filter(([key]) => key !== 'signingSecret')
    );
    const rawRelationships = result.webhook.relationships;
    const webhook = {
      ...result.webhook,
      attributes: safeAttributes
    };
    const relationships =
      typeof rawRelationships === 'object' &&
      rawRelationships !== null &&
      !Array.isArray(rawRelationships)
        ? rawRelationships
        : undefined;
    const party = relationships?.party?.data;
    const tags =
      typeof attributes.tags === 'object' &&
      attributes.tags !== null &&
      !Array.isArray(attributes.tags)
        ? attributes.tags
        : undefined;

    return {
      output: {
        webhookId: result.webhookId,
        type: result.type,
        url: typeof attributes.url === 'string' ? attributes.url : undefined,
        description:
          typeof attributes.description === 'string' ? attributes.description : undefined,
        status: result.status,
        enabledEvents: Array.isArray(attributes.enabledEvents)
          ? attributes.enabledEvents.filter(event => typeof event === 'string')
          : undefined,
        tags,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        updatedAt: typeof attributes.updatedAt === 'string' ? attributes.updatedAt : undefined,
        partyId: typeof party?.id === 'string' ? party.id : undefined,
        relationships,
        webhook
      },
      message: `Retrieved webhook **${ctx.input.webhookId}**.`
    };
  })
  .build();

export const updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description:
    'Update a Natural webhook by ID, returning its delivery URL, status, subscribed events, tags, timestamps, and owning party. Signing secrets are never returned.'
})
  .input(
    z.object({
      webhookId: z
        .string()
        .refine(
          webhookId => webhookId.startsWith('whk_') && webhookId.length > 4,
          'Webhook ID must have the whk_ prefix and a nonempty suffix.'
        )
        .refine(webhookId => {
          try {
            encodeURIComponent(webhookId);
            return true;
          } catch {
            return false;
          }
        }, 'Webhook ID must be URI-encodable.')
        .describe('Natural webhook ID with the whk_ prefix and a nonempty opaque suffix.'),
      url: z.string().url().optional().describe('Updated webhook endpoint URL.'),
      description: z.string().max(500).optional().describe('Updated webhook description.'),
      status: z.enum(['ENABLED', 'DISABLED']).optional().describe('Updated webhook status.'),
      enabledEvents: z
        .array(z.enum(['*', 'compliance_case.updated', ...naturalEventTypes]))
        .min(1)
        .superRefine((events, ctx) => {
          if (events.includes('*') && events.length !== 1) {
            ctx.addIssue({
              code: 'custom',
              message: 'Use "*" as the only enabledEvents entry.'
            });
          }
        })
        .optional()
        .describe(
          'Updated Natural event subscriptions. Use "*" by itself to subscribe to all events.'
        ),
      tags: z
        .record(z.string(), z.string().nullable())
        .optional()
        .describe(
          'Updated non-sensitive webhook tags. Use null to remove a tag key; legacy empty-string removals are also accepted.'
        ),
      idempotencyKey: idempotencyKeySchema
    })
  )
  .output(
    z.object({
      webhookId: z.string().optional(),
      type: z.string().optional(),
      url: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      enabledEvents: z.array(z.string()).optional(),
      tags: z.record(z.string(), z.string()).optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      partyId: z.string().optional(),
      relationships: rawRecordSchema.optional(),
      webhook: rawRecordSchema.describe(
        'Raw non-secret Natural webhook resource, including additive provider metadata.'
      )
    })
  )
  .handleInvocation(async ctx => {
    requireIdempotencyKey(ctx.input.idempotencyKey, 'update a webhook');
    const normalizedTags = ctx.input.tags
      ? Object.fromEntries(
          Object.entries(ctx.input.tags).map(([key, value]) => [
            key,
            value === '' ? null : value
          ])
        )
      : undefined;
    const body = attributesBody({
      url: ctx.input.url,
      description: ctx.input.description,
      status: ctx.input.status,
      enabledEvents: ctx.input.enabledEvents,
      tags: normalizedTags
    });
    ensureAtLeastOneField(body, 'webhook update');

    const client = createClient(ctx);
    const envelope = await client.request(
      'update webhook',
      'patch',
      `/webhooks/${encodeURIComponent(ctx.input.webhookId)}`,
      {
        idempotencyKey: ctx.input.idempotencyKey,
        body: jsonApiBody(body)
      }
    );
    const result = resourceResult(envelope, 'webhookId', 'webhook');
    const attributes = attributesOf(result.webhook);
    const safeAttributes = Object.fromEntries(
      Object.entries(attributes).filter(([key]) => key !== 'signingSecret')
    );
    const safeWebhook = Object.fromEntries(
      Object.entries(result.webhook).filter(([key]) => key !== 'signingSecret')
    );
    const rawRelationships = result.webhook.relationships;
    const relationships =
      typeof rawRelationships === 'object' &&
      rawRelationships !== null &&
      !Array.isArray(rawRelationships)
        ? rawRelationships
        : undefined;
    const party = relationships?.party?.data;
    const tags =
      typeof attributes.tags === 'object' &&
      attributes.tags !== null &&
      !Array.isArray(attributes.tags)
        ? Object.fromEntries(
            Object.entries(attributes.tags).filter((entry): entry is [string, string] => {
              return typeof entry[1] === 'string';
            })
          )
        : undefined;

    return {
      output: {
        webhookId: result.webhookId,
        type: result.type,
        url: typeof attributes.url === 'string' ? attributes.url : undefined,
        description:
          typeof attributes.description === 'string' ? attributes.description : undefined,
        status: result.status,
        enabledEvents: Array.isArray(attributes.enabledEvents)
          ? attributes.enabledEvents.filter(event => typeof event === 'string')
          : undefined,
        tags,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        updatedAt: typeof attributes.updatedAt === 'string' ? attributes.updatedAt : undefined,
        partyId: typeof party?.id === 'string' ? party.id : undefined,
        relationships,
        webhook: {
          ...safeWebhook,
          attributes: safeAttributes
        }
      },
      message: `Updated webhook **${ctx.input.webhookId}**.`
    };
  })
  .build();

const deleteWebhookIdSchema = z
  .string()
  .min(5, 'Webhook IDs require a non-empty value after whk_.')
  .startsWith('whk_', 'Webhook IDs use the whk_ prefix.')
  .refine(value => {
    try {
      encodeURIComponent(value);
      return true;
    } catch {
      return false;
    }
  }, 'Natural webhook ID must be well-formed Unicode.');

const deleteWebhookSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('webhook'),
        id: z.string().min(1),
        attributes: z
          .object({
            status: z.string().min(1)
          })
          .passthrough()
      })
      .passthrough(),
    meta: z
      .object({
        deleted: z.literal(true)
      })
      .passthrough()
  })
  .passthrough();

export const deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description:
    'Delete a Natural webhook by ID. Requires explicit confirmation and an idempotency key, and returns the deleted webhook ID, status, non-secret raw resource, and response metadata.',
  tags: { destructive: true }
})
  .input(
    z.object({
      webhookId: deleteWebhookIdSchema.describe(
        'Natural webhook ID with a whk_ prefix and non-empty opaque suffix.'
      ),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      webhookId: z.string().min(1).describe('Deleted Natural webhook ID.'),
      type: z.literal('webhook').describe('Natural resource type.'),
      status: z.string().min(1).describe('Webhook status immediately before deletion.'),
      webhook: rawRecordSchema.describe(
        'Raw non-secret Natural webhook resource returned after deletion.'
      ),
      deleted: z.literal(true).describe('Natural confirmed the webhook was deleted.'),
      meta: rawRecordSchema.describe(
        'Raw Natural response metadata, including deletion confirmation and additive metadata.'
      )
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'delete this webhook');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'delete a webhook');
    const client = createClient(ctx);
    const envelope = await client.request(
      'delete webhook',
      'delete',
      `/webhooks/${encodeURIComponent(ctx.input.webhookId)}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );
    const response = deleteWebhookSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when deleting the webhook. Verify webhook state in Natural before retrying, and reuse the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }
    if (response.data.data.id !== ctx.input.webhookId) {
      throw naturalServiceError(
        'Natural returned a different webhook than the one requested when deleting it. Verify webhook state in Natural before retrying, and reuse the same idempotency key to safely recover the original result.',
        'natural_response_error'
      );
    }

    const { data: webhook, meta } = response.data;
    const safeAttributes = Object.fromEntries(
      Object.entries(webhook.attributes).filter(([name]) => name !== 'signingSecret')
    );
    const safeWebhook = Object.fromEntries(
      Object.entries(webhook).filter(([name]) => name !== 'signingSecret')
    );
    safeWebhook.attributes = safeAttributes;

    return {
      output: {
        webhookId: webhook.id,
        type: webhook.type,
        status: webhook.attributes.status,
        webhook: safeWebhook,
        deleted: meta.deleted,
        meta
      },
      message: `Deleted webhook **${ctx.input.webhookId}**.`
    };
  })
  .build();

const rotateWebhookIdSchema = z
  .string()
  .min(5, 'Webhook IDs require a non-empty value after whk_.')
  .startsWith('whk_', 'Webhook IDs use the whk_ prefix.')
  .refine(value => {
    try {
      encodeURIComponent(value);
      return true;
    } catch {
      return false;
    }
  }, 'Natural webhook ID must be well-formed Unicode.');

const rotateWebhookSecretSuccessSchema = z
  .object({
    data: z
      .object({
        type: z.literal('webhook'),
        id: z.string().min(1),
        attributes: z
          .object({
            signingSecret: z.string().min(1),
            previousSecretExpiresAt: z.string().datetime({ offset: true }).nullable()
          })
          .passthrough(),
        relationships: z
          .object({
            party: z
              .object({
                data: z
                  .object({
                    type: z.literal('party'),
                    id: z.string().min(1)
                  })
                  .passthrough()
              })
              .passthrough()
          })
          .passthrough()
      })
      .passthrough()
  })
  .passthrough();

export const rotateWebhookSecret = SlateTool.create(spec, {
  name: 'Rotate Webhook Secret',
  key: 'rotate_webhook_secret',
  description:
    'Rotate a Natural webhook signing secret and return the one-time new secret only in output.signingSecret, together with the previous-secret expiry and owning-party metadata. Requires confirmation.',
  constraints: [
    'The new webhook signing secret is returned only once.',
    'The previous secret remains valid for expiresInSeconds, then becomes invalid.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      webhookId: rotateWebhookIdSchema.describe(
        'Natural webhook ID with a whk_ prefix and non-empty opaque suffix.'
      ),
      expiresInSeconds: z
        .number()
        .int()
        .min(0)
        .max(86400)
        .describe('Grace period for the previous secret. 0 means immediate cutover.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      webhookId: z.string().min(1),
      type: z.literal('webhook'),
      partyId: z.string().min(1),
      relationships: rawRecordSchema,
      signingSecret: z
        .string()
        .min(1)
        .describe('One-time Natural webhook signing secret. Store it securely.'),
      previousSecretExpiresAt: z
        .string()
        .datetime({ offset: true })
        .nullable()
        .describe('When the previous signing secret expires; null means immediate cutover.'),
      webhook: rawRecordSchema.describe(
        'Raw non-secret Natural rotation resource, including relationships and additive metadata.'
      )
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'rotate this webhook secret');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'rotate a webhook secret');
    const client = createClient(ctx);
    const envelope = await client.request(
      'rotate webhook secret',
      'post',
      `/webhooks/${encodeURIComponent(ctx.input.webhookId)}/rotate-secret`,
      {
        idempotencyKey: ctx.input.idempotencyKey,
        body: jsonApiBody({
          expiresInSeconds: ctx.input.expiresInSeconds
        })
      }
    );
    const response = rotateWebhookSecretSuccessSchema.safeParse(envelope);
    if (!response.success) {
      throw naturalServiceError(
        'Natural returned a malformed success response when rotating the webhook secret. Retry this rotation with the same idempotency key to safely recover the original one-time secret.',
        'natural_response_error'
      );
    }
    if (response.data.data.id !== ctx.input.webhookId) {
      throw naturalServiceError(
        'Natural returned a different webhook than the one whose secret was rotated. Retry this rotation with the same idempotency key to safely recover the original one-time secret.',
        'natural_response_error'
      );
    }

    const resource = response.data.data;
    const { attributes, relationships } = resource;
    const safeAttributes = Object.fromEntries(
      Object.entries(attributes).filter(([key]) => key !== 'signingSecret')
    );
    const safeWebhook = Object.fromEntries(
      Object.entries(resource).filter(([key]) => key !== 'signingSecret')
    );
    safeWebhook.attributes = safeAttributes;

    return {
      output: {
        webhookId: resource.id,
        type: resource.type,
        partyId: relationships.party.data.id,
        relationships,
        signingSecret: attributes.signingSecret,
        previousSecretExpiresAt: attributes.previousSecretExpiresAt,
        webhook: safeWebhook
      },
      message: `Rotated webhook secret for **${ctx.input.webhookId}**. Store the returned secret securely.`
    };
  })
  .build();

export const listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description:
    'List Natural party events with optional event-type and created-time filters, returning stable event and resource IDs, payload snapshots, ownership metadata, raw provider records, and cursor pagination.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      partyId: z
        .string()
        .regex(/^pty_.+$/)
        .optional()
        .describe(
          'Natural party ID to list events for, with the pty_ prefix and a nonempty opaque suffix. Defaults to the authenticated party.'
        ),
      eventType: z
        .enum(['compliance_case.updated', ...eventTypeSchema.options])
        .optional()
        .describe('Filter by the Natural event type that triggered the event.'),
      createdAfter: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('Return events created after this RFC 3339 timestamp.'),
      createdBefore: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('Return events created before this RFC 3339 timestamp.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      events: z.array(
        z
          .object({
            eventId: z.string().optional().describe('Natural event ID (evt_*).'),
            type: z.string().optional().describe('Natural resource type, normally event.'),
            eventType: z.string().optional().describe('Type of event that Natural recorded.'),
            resourceId: z
              .string()
              .optional()
              .describe('ID of the resource that triggered the event.'),
            resourceType: z
              .string()
              .optional()
              .describe('Type of resource that triggered the event.'),
            payload: rawRecordSchema
              .optional()
              .describe(
                'Natural event payload, including its point-in-time resource snapshot.'
              ),
            object: z
              .any()
              .optional()
              .describe('Point-in-time resource snapshot from payload.object.'),
            createdAt: z.string().optional().describe('When Natural created the event.'),
            partyId: z.string().optional().describe('Natural party that owns the event.'),
            relationships: rawRecordSchema
              .optional()
              .describe('Raw Natural event relationship metadata.'),
            event: rawRecordSchema.describe(
              'Raw Natural event resource, including additive provider metadata.'
            )
          })
          .passthrough()
      ),
      pagination: z.object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable()
      })
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('list events', 'get', '/events', {
      params: {
        partyId: ctx.input.partyId,
        eventType: ctx.input.eventType,
        createdAfter: ctx.input.createdAfter,
        createdBefore: ctx.input.createdBefore,
        cursor: ctx.input.cursor,
        limit: ctx.input.limit
      }
    });
    const rawOutput = listRawResult(envelope, 'events');
    const events = rawOutput.events.map(event => {
      const attributes = attributesOf(event);
      const rawPayload = attributes.payload;
      const payload =
        typeof rawPayload === 'object' && rawPayload !== null && !Array.isArray(rawPayload)
          ? rawPayload
          : undefined;
      const rawRelationships = event.relationships;
      const relationships =
        typeof rawRelationships === 'object' &&
        rawRelationships !== null &&
        !Array.isArray(rawRelationships)
          ? rawRelationships
          : undefined;
      const party = relationships?.party?.data;

      return {
        ...event,
        eventId: typeof event.id === 'string' ? event.id : undefined,
        type: typeof event.type === 'string' ? event.type : undefined,
        eventType: typeof attributes.eventType === 'string' ? attributes.eventType : undefined,
        resourceId:
          typeof attributes.resourceId === 'string' ? attributes.resourceId : undefined,
        resourceType:
          typeof attributes.resourceType === 'string' ? attributes.resourceType : undefined,
        payload,
        object: payload?.object,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        partyId: typeof party?.id === 'string' ? party.id : undefined,
        relationships,
        event
      };
    });
    const output = {
      events,
      pagination: rawOutput.pagination
    };

    return {
      output,
      message: summaryListMessage(countOf(output, 'events'), 'events')
    };
  })
  .build();

export const getEvent = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description:
    'Retrieve a Natural event by ID, including the triggering resource, point-in-time payload snapshot, timestamp, owning party, relationships, and raw provider metadata.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventId: z
        .string()
        .regex(/^evt_[0-9a-f]{32}$/)
        .describe('Natural event ID (evt_ followed by 32 lowercase hexadecimal characters).'),
      partyId: z
        .string()
        .regex(/^pty_[0-9a-f]{32}$/)
        .optional()
        .describe(
          'Natural party that owns the event (pty_ followed by 32 lowercase hexadecimal characters). Defaults to the authenticated party; use an authorized party ID to act on its behalf.'
        )
    })
  )
  .output(
    z.object({
      eventId: z.string().optional().describe('Natural event ID (evt_*).'),
      type: z.string().optional().describe('Natural resource type, normally event.'),
      eventType: z.string().optional().describe('Type of event that Natural recorded.'),
      resourceId: z
        .string()
        .optional()
        .describe('ID of the resource that triggered the event.'),
      resourceType: z
        .string()
        .optional()
        .describe('Type of resource that triggered the event.'),
      payload: rawRecordSchema
        .optional()
        .describe('Natural event payload, including its point-in-time resource snapshot.'),
      object: z
        .any()
        .optional()
        .describe('Point-in-time resource snapshot from payload.object.'),
      createdAt: z.string().optional().describe('When Natural created the event.'),
      partyId: z.string().optional().describe('Natural party that owns the event.'),
      relationships: rawRecordSchema
        .optional()
        .describe('Raw Natural event relationship metadata.'),
      event: rawRecordSchema.describe(
        'Raw Natural event resource, including additive provider metadata.'
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('get event', 'get', `/events/${ctx.input.eventId}`, {
      params: {
        partyId: ctx.input.partyId
      }
    });
    const result = resourceResult(envelope, 'eventId', 'event');
    const attributes = attributesOf(result.event);
    const rawPayload = attributes.payload;
    const payload =
      typeof rawPayload === 'object' && rawPayload !== null && !Array.isArray(rawPayload)
        ? rawPayload
        : undefined;
    const rawRelationships = result.event.relationships;
    const relationships =
      typeof rawRelationships === 'object' &&
      rawRelationships !== null &&
      !Array.isArray(rawRelationships)
        ? rawRelationships
        : undefined;
    const party = relationships?.party?.data;

    return {
      output: {
        eventId: result.eventId,
        type: result.type,
        eventType: typeof attributes.eventType === 'string' ? attributes.eventType : undefined,
        resourceId:
          typeof attributes.resourceId === 'string' ? attributes.resourceId : undefined,
        resourceType:
          typeof attributes.resourceType === 'string' ? attributes.resourceType : undefined,
        payload,
        object: payload?.object,
        createdAt: typeof attributes.createdAt === 'string' ? attributes.createdAt : undefined,
        partyId: typeof party?.id === 'string' ? party.id : undefined,
        relationships,
        event: result.event
      },
      message: `Retrieved event **${ctx.input.eventId}**.`
    };
  })
  .build();
