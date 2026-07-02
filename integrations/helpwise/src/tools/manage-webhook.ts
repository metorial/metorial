import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Create, list, retrieve, or delete webhooks for receiving real-time event notifications. Webhooks deliver event payloads to your callback URL when events occur in Helpwise.`,
  instructions: [
    'Available event types: conversation_created, conversation_closed, conversation_reopened, conversation_deleted, conversation_assigned, note_added, tag_applied, agent_reply, customer_reply.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'delete']).describe('The operation to perform'),
      webhookId: z.string().optional().describe('Webhook ID (required for get, delete)'),
      url: z
        .string()
        .optional()
        .describe('Callback URL to receive events (required for create)'),
      eventType: z
        .string()
        .optional()
        .describe('Event type to subscribe to (required for create)'),
      secretKey: z
        .string()
        .optional()
        .describe('Optional secret key for webhook verification (for create)')
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of webhooks (for list action)'),
      webhook: z
        .record(z.string(), z.any())
        .optional()
        .describe('Webhook details (for get, create)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, webhookId, url, eventType, secretKey } = ctx.input;

    if (action === 'list') {
      let result = await client.listWebhooks();
      let webhooks = Array.isArray(result) ? result : (result.webhooks ?? result.data ?? []);
      return {
        output: { webhooks, success: true },
        message: `Retrieved ${webhooks.length} webhook(s).`
      };
    }

    if (action === 'get') {
      if (!webhookId) throw new Error('webhookId is required for get action');
      let webhook = await client.getWebhook(webhookId);
      return {
        output: { webhook, success: true },
        message: `Retrieved webhook **${webhookId}**.`
      };
    }

    if (action === 'create') {
      if (!url) throw new Error('url is required for create action');
      if (!eventType) throw new Error('eventType is required for create action');
      let webhook = await client.createWebhook({
        url,
        event_type: eventType,
        secret_key: secretKey
      });
      return {
        output: { webhook, success: true },
        message: `Created webhook for event **${eventType}** at ${url}.`
      };
    }

    if (action === 'delete') {
      if (!webhookId) throw new Error('webhookId is required for delete action');
      await client.deleteWebhook(webhookId);
      return {
        output: { success: true },
        message: `Deleted webhook **${webhookId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
