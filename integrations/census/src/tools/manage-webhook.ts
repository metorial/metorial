import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { workspaceClient } from '../lib/client';
import { webhookEvents, workspaceId } from '../lib/schemas';
import { spec } from '../spec';

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Creates, updates, or deletes a Census webhook. Webhooks notify external HTTPS endpoints when sync alert events occur (e.g., sync failures, alert resolution). Specify an action: "create" to register a new webhook, "update" to modify an existing one, or "delete" to remove it.`,
  instructions: [
    'Supports sync alerts and lifecycle events. If events are omitted, the provider subscribes to all events; registered endpoints may receive external requests.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workspaceId,
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the webhook.'),
      webhookId: z
        .number()
        .optional()
        .describe('ID of the webhook (required for update and delete).'),
      name: z.string().optional().describe('Name of the webhook (required for create).'),
      endpoint: z
        .string()
        .optional()
        .describe('HTTPS URL to receive webhook events (required for create).'),
      description: z.string().optional().describe('Description of the webhook.'),
      events: z
        .array(webhookEvents.element)
        .optional()
        .describe('Event types to subscribe to. If omitted, receives all events.')
    })
  )
  .output(
    z.object({
      webhookId: z.number().optional().describe('ID of the created or updated webhook.'),
      name: z.string().optional().describe('Name of the webhook.'),
      endpoint: z.string().optional().describe('Webhook endpoint URL.'),
      events: z.array(z.string()).optional().describe('Subscribed event types.'),
      deleted: z.boolean().optional().describe('Whether the webhook was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = await workspaceClient(ctx);

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.endpoint) {
        throw createApiServiceError('Name and endpoint are required when creating a webhook.');
      }
      let webhook = await client.createWebhook({
        name: ctx.input.name,
        endpoint: ctx.input.endpoint,
        description: ctx.input.description,
        events: ctx.input.events
      });
      return {
        output: {
          webhookId: webhook.id,
          name: webhook.name,
          endpoint: webhook.endpoint,
          events: webhook.events
        },
        message: `Created webhook **${webhook.name}** (ID: ${webhook.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (ctx.input.webhookId === undefined) {
        throw createApiServiceError('webhookId is required when updating a webhook.');
      }
      let webhook = await client.updateWebhook(ctx.input.webhookId, {
        name: ctx.input.name,
        endpoint: ctx.input.endpoint,
        description: ctx.input.description,
        events: ctx.input.events
      });
      return {
        output: {
          webhookId: webhook.id,
          name: webhook.name,
          endpoint: webhook.endpoint,
          events: webhook.events
        },
        message: `Updated webhook **${webhook.name}** (ID: ${webhook.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (ctx.input.webhookId === undefined) {
        throw createApiServiceError('webhookId is required when deleting a webhook.');
      }
      await client.deleteWebhook(ctx.input.webhookId);
      return {
        output: {
          deleted: true
        },
        message: `Deleted webhook **${ctx.input.webhookId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
