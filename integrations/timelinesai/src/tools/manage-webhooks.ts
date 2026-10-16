import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, requireArray } from '../lib/client';
import { spec } from '../spec';

let webhookSchema = z.object({
  webhookId: z.number().describe('Webhook ID'),
  eventType: z.string().optional().describe('Event type the webhook listens for'),
  url: z.string().optional().describe('Destination HTTPS endpoint'),
  enabled: z.boolean().optional().describe('Whether the webhook is active'),
  errorsCounter: z.number().optional().describe('Number of consecutive delivery failures')
});

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `List, create, update, or delete webhooks for real-time event notifications. Webhooks deliver events such as new messages, new chats, and chat renames to a specified HTTPS endpoint.`,
  instructions: [
    'Set the action to "list", "create", "get", "update", or "delete".',
    'Use provider-documented event names, for example message:sent:new or message:received:new.',
    'Webhook limits depend on your workspace subscription.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'update', 'delete'])
        .describe('The webhook operation to perform'),
      webhookId: z
        .number()
        .optional()
        .describe('Webhook ID (for get, update, delete actions)'),
      eventType: z
        .string()
        .optional()
        .describe(
          'Event type (for create/update). E.g., message:sent:new or message:received:new'
        ),
      url: z.string().optional().describe('HTTPS endpoint URL (for create/update)'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the webhook is active (for create/update)')
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(webhookSchema)
        .optional()
        .describe('List of webhooks (for list action)'),
      webhook: webhookSchema
        .optional()
        .describe('Webhook details (for create, get, update actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the webhook was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, webhookId, eventType, url, enabled } = ctx.input;

    let mapWebhook = (w: any) => ({
      webhookId: w.id,
      eventType: w.event_type,
      url: w.url,
      enabled: w.enabled,
      errorsCounter: w.errors_counter
    });

    if (action === 'list') {
      let result = await client.listWebhooks();
      let webhooks = requireArray(result?.data, 'webhooks').map(mapWebhook);
      return {
        output: { webhooks },
        message: `Found **${webhooks.length}** webhook(s).`
      };
    }

    if (action === 'create') {
      if (!eventType) throw createApiServiceError('eventType is required for create action');
      if (!url) throw createApiServiceError('url is required for create action');
      let result = await client.createWebhook({ eventType, url, enabled });
      let webhook = mapWebhook(result?.data || result);
      return {
        output: { webhook },
        message: `Webhook created for **${eventType}** → ${url}`
      };
    }

    if (action === 'get') {
      if (!webhookId) throw createApiServiceError('webhookId is required for get action');
      let result = await client.getWebhook(webhookId);
      let webhook = mapWebhook(result?.data || result);
      return {
        output: { webhook },
        message: `Webhook **${webhookId}** retrieved.`
      };
    }

    if (action === 'update') {
      if (!webhookId) throw createApiServiceError('webhookId is required for update action');
      let result = await client.updateWebhook(webhookId, { eventType, url, enabled });
      let webhook = mapWebhook(result?.data || result);
      return {
        output: { webhook },
        message: `Webhook **${webhookId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!webhookId) throw createApiServiceError('webhookId is required for delete action');
      await client.deleteWebhook(webhookId);
      return {
        output: { deleted: true },
        message: `Webhook **${webhookId}** deleted.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
