import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Create, update, or delete webhooks for receiving email and domain events. Webhooks can be scoped to specific pods or inboxes.
Available event types: \`message.received\`, \`message.sent\`, \`message.delivered\`, \`message.bounced\`, \`message.complained\`, \`message.rejected\`, \`domain.verified\`.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      webhookId: z.string().optional().describe('Webhook ID (required for update and delete)'),
      url: z.string().optional().describe('Webhook endpoint URL (required for create)'),
      eventTypes: z.array(z.string()).optional().describe('Event types to subscribe to'),
      podIds: z.array(z.string()).optional().describe('Scope to specific pod IDs (max 10)'),
      inboxIds: z
        .array(z.string())
        .optional()
        .describe('Scope to specific inbox IDs (max 10)'),
      enabled: z.boolean().optional().describe('Enable or disable the webhook (for update)')
    })
  )
  .output(
    z.object({
      webhookId: z.string().optional().describe('Webhook identifier'),
      url: z.string().optional().describe('Webhook endpoint URL'),
      eventTypes: z.array(z.string()).optional().describe('Subscribed event types'),
      secret: z
        .string()
        .optional()
        .describe('Webhook secret for signature verification (only on create)'),
      enabled: z.boolean().optional().describe('Whether the webhook is enabled'),
      deleted: z.boolean().optional().describe('Whether the webhook was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    if (ctx.input.action === 'create') {
      if (!ctx.input.url) throw new Error('url is required for create action');
      if (!ctx.input.eventTypes?.length)
        throw new Error('eventTypes is required for create action');

      let webhook = await client.createWebhook(
        ctx.input.url,
        ctx.input.eventTypes,
        ctx.input.podIds,
        ctx.input.inboxIds
      );

      return {
        output: {
          webhookId: webhook.webhook_id,
          url: webhook.url,
          eventTypes: webhook.event_types,
          secret: webhook.secret,
          enabled: webhook.enabled
        },
        message: `Created webhook for events: ${webhook.event_types.join(', ')}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.webhookId) throw new Error('webhookId is required for update action');

      let webhook = await client.updateWebhook(ctx.input.webhookId, {
        url: ctx.input.url,
        eventTypes: ctx.input.eventTypes,
        podIds: ctx.input.podIds,
        inboxIds: ctx.input.inboxIds,
        enabled: ctx.input.enabled
      });

      return {
        output: {
          webhookId: webhook.webhook_id,
          url: webhook.url,
          eventTypes: webhook.event_types,
          enabled: webhook.enabled
        },
        message: `Updated webhook **${webhook.webhook_id}**.`
      };
    }

    // delete
    if (!ctx.input.webhookId) throw new Error('webhookId is required for delete action');
    await client.deleteWebhook(ctx.input.webhookId);

    return {
      output: { deleted: true },
      message: `Deleted webhook **${ctx.input.webhookId}**.`
    };
  })
  .build();
