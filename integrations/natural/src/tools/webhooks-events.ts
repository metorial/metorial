import { SlateTool } from 'slates';
import { z } from 'zod';
import { attributesOf, jsonApiBody, singleData } from '../lib/envelopes';
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
  deleteOutput,
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
    'Create a Natural webhook and return the one-time signing secret in output.signingSecret.',
  constraints: ['The webhook signing secret is returned only once at creation time.']
})
  .input(
    z.object({
      url: z.string().url().describe('Webhook endpoint URL.'),
      enabledEvents: z
        .array(webhookEventSchema)
        .min(1)
        .describe('Natural event types this webhook should receive.'),
      description: z.string().max(500).optional().describe('Webhook description.'),
      tags: z.record(z.string(), z.string()).optional().describe('Optional webhook tags.'),
      idempotencyKey: idempotencyKeySchema
    })
  )
  .output(webhookOutputSchema)
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

    return {
      output: webhookOutput(envelope, true),
      message: `Created webhook for **${ctx.input.url}**. Store the returned signing secret securely.`
    };
  })
  .build();

export const getWebhook = SlateTool.create(spec, {
  name: 'Get Webhook',
  key: 'get_webhook',
  description: 'Retrieve a Natural webhook by ID. Signing secret is not returned.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      webhookId: z.string().min(1).describe('Natural webhook ID.')
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request(
      'get webhook',
      'get',
      `/webhooks/${ctx.input.webhookId}`
    );

    return {
      output: webhookOutput(envelope),
      message: `Retrieved webhook **${ctx.input.webhookId}**.`
    };
  })
  .build();

export const updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description:
    'Update Natural webhook metadata. Natural exposes this as PUT, but fields are optional per OpenAPI schema.'
})
  .input(
    z.object({
      webhookId: z.string().min(1).describe('Natural webhook ID.'),
      url: z.string().url().optional().describe('Updated webhook endpoint URL.'),
      description: z.string().max(500).optional().describe('Updated webhook description.'),
      status: z.enum(['ENABLED', 'DISABLED']).optional().describe('Updated webhook status.'),
      enabledEvents: z.array(webhookEventSchema).min(1).optional().describe('Updated events.'),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated webhook tags. Use an empty string value to remove a tag key.'),
      idempotencyKey: idempotencyKeySchema
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    requireIdempotencyKey(ctx.input.idempotencyKey, 'update a webhook');
    const body = attributesBody({
      url: ctx.input.url,
      description: ctx.input.description,
      status: ctx.input.status,
      enabledEvents: ctx.input.enabledEvents,
      tags: ctx.input.tags
    });
    ensureAtLeastOneField(body, 'webhook update');

    const client = createClient(ctx);
    const envelope = await client.request(
      'update webhook',
      'put',
      `/webhooks/${ctx.input.webhookId}`,
      {
        idempotencyKey: ctx.input.idempotencyKey,
        body: jsonApiBody(body)
      }
    );

    return {
      output: webhookOutput(envelope),
      message: `Updated webhook **${ctx.input.webhookId}**.`
    };
  })
  .build();

export const deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: 'Delete a Natural webhook.',
  tags: { destructive: true }
})
  .input(
    z.object({
      webhookId: z.string().min(1).describe('Natural webhook ID.'),
      idempotencyKey: idempotencyKeySchema,
      confirm: confirmSchema
    })
  )
  .output(
    z.object({
      webhookId: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      webhook: rawRecordSchema,
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'delete this webhook');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'delete a webhook');
    const client = createClient(ctx);
    const envelope = await client.request(
      'delete webhook',
      'delete',
      `/webhooks/${ctx.input.webhookId}`,
      { idempotencyKey: ctx.input.idempotencyKey }
    );

    return {
      output: deleteOutput(envelope, 'webhookId', 'webhook'),
      message: `Deleted webhook **${ctx.input.webhookId}**.`
    };
  })
  .build();

export const rotateWebhookSecret = SlateTool.create(spec, {
  name: 'Rotate Webhook Secret',
  key: 'rotate_webhook_secret',
  description:
    'Rotate a Natural webhook signing secret and return the one-time new secret in output.signingSecret.',
  constraints: ['The new webhook signing secret is returned only once.']
})
  .input(
    z.object({
      webhookId: z.string().min(1).describe('Natural webhook ID.'),
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
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    requireConfirm(ctx.input.confirm, 'rotate this webhook secret');
    requireIdempotencyKey(ctx.input.idempotencyKey, 'rotate a webhook secret');
    const client = createClient(ctx);
    const envelope = await client.request(
      'rotate webhook secret',
      'post',
      `/webhooks/${ctx.input.webhookId}/rotate-secret`,
      {
        idempotencyKey: ctx.input.idempotencyKey,
        body: jsonApiBody({
          expiresInSeconds: ctx.input.expiresInSeconds
        })
      }
    );

    return {
      output: webhookOutput(envelope, true),
      message: `Rotated webhook secret for **${ctx.input.webhookId}**. Store the returned secret securely.`
    };
  })
  .build();

export const listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: 'List Natural events with optional type, party, and created-time filters.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      partyId: z.string().optional().describe('Optional party ID filter.'),
      eventType: eventTypeSchema.optional().describe('Natural event type filter.'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter events created after this timestamp.'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter events created before this timestamp.'),
      ...paginationInputFields
    })
  )
  .output(
    z.object({
      events: rawRecordArraySchema,
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
    const output = listRawResult(envelope, 'events');

    return {
      output,
      message: summaryListMessage(countOf(output, 'events'), 'events')
    };
  })
  .build();

export const getEvent = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: 'Retrieve a Natural event by ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventId: z.string().min(1).describe('Natural event ID.'),
      partyId: z.string().optional().describe('Optional party ID filter.')
    })
  )
  .output(
    z.object({
      eventId: z.string().optional(),
      type: z.string().optional(),
      event: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const envelope = await client.request('get event', 'get', `/events/${ctx.input.eventId}`, {
      params: {
        partyId: ctx.input.partyId
      }
    });

    return {
      output: resourceResult(envelope, 'eventId', 'event'),
      message: `Retrieved event **${ctx.input.eventId}**.`
    };
  })
  .build();
