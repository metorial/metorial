import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `Manage webhook configurations for receiving event notifications. Supports listing, creating, updating, and deleting webhooks, as well as viewing delivery history.`,
  instructions: [
    'Use action "list" to list all configured webhooks.',
    'Use action "get" to get details of a specific webhook.',
    'Use action "create" to create a new webhook endpoint.',
    'Use action "update" to modify an existing webhook.',
    'Use action "delete" to remove a webhook.',
    'Use action "list_modules" to see available webhook event scopes.',
    'Use action "history" to view delivery history for all or a specific webhook.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'list_modules', 'history'])
        .describe('The operation to perform'),
      webhookId: z
        .string()
        .optional()
        .describe(
          'ID of the webhook (required for get, update, delete, and per-webhook history)'
        ),
      name: z.string().optional().describe('Name of the webhook (create, update)'),
      postUrl: z
        .string()
        .optional()
        .describe('Target URL for webhook delivery (create, update)'),
      actions: z
        .array(z.string())
        .optional()
        .describe('List of event action types to subscribe to (create, update)'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the webhook is active (create, update)'),
      module: z.string().optional().describe('Event scope/module category (create, update)'),
      secretKey: z
        .string()
        .optional()
        .describe('Shared secret for HMAC-SHA256 payload verification (create, update)'),
      webhookProfileId: z
        .string()
        .optional()
        .describe('Scope webhook to a specific profile ID (create, update)'),
      page: z.number().optional().describe('Page number for pagination'),
      size: z.number().optional().describe('Number of results per page')
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    switch (ctx.input.action) {
      case 'list': {
        let webhooks = await client.listWebhooks({
          page: ctx.input.page,
          size: ctx.input.size
        });
        let items = Array.isArray(webhooks) ? webhooks : [];
        return { output: items, message: `Found **${items.length}** webhook(s).` };
      }
      case 'get': {
        if (!ctx.input.webhookId) throw new Error('webhookId is required');
        let webhook = await client.getWebhook(ctx.input.webhookId);
        return { output: webhook, message: `Retrieved webhook **${ctx.input.webhookId}**.` };
      }
      case 'create': {
        if (!ctx.input.postUrl || !ctx.input.actions?.length)
          throw new Error('postUrl and actions are required');
        let created = await client.createWebhook({
          name: ctx.input.name,
          postUrl: ctx.input.postUrl,
          actions: ctx.input.actions,
          enabled: ctx.input.enabled,
          module: ctx.input.module,
          secretKey: ctx.input.secretKey,
          profileId: ctx.input.webhookProfileId
        });
        return { output: created, message: `Created webhook for **${ctx.input.postUrl}**.` };
      }
      case 'update': {
        if (!ctx.input.webhookId) throw new Error('webhookId is required');
        let updated = await client.updateWebhook(ctx.input.webhookId, {
          name: ctx.input.name,
          postUrl: ctx.input.postUrl,
          actions: ctx.input.actions,
          enabled: ctx.input.enabled,
          module: ctx.input.module,
          secretKey: ctx.input.secretKey,
          profileId: ctx.input.webhookProfileId
        });
        return { output: updated, message: `Updated webhook **${ctx.input.webhookId}**.` };
      }
      case 'delete': {
        if (!ctx.input.webhookId) throw new Error('webhookId is required');
        await client.deleteWebhook(ctx.input.webhookId);
        return {
          output: { success: true },
          message: `Deleted webhook **${ctx.input.webhookId}**.`
        };
      }
      case 'list_modules': {
        let modules = await client.listWebhookModules();
        return { output: modules, message: `Retrieved webhook event modules.` };
      }
      case 'history': {
        let history = await client.getWebhookHistory(ctx.input.webhookId, {
          page: ctx.input.page,
          size: ctx.input.size
        });
        let items = Array.isArray(history) ? history : [];
        return { output: items, message: `Found **${items.length}** delivery record(s).` };
      }
    }
  })
  .build();
