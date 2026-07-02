import { SlateTool } from 'slates';
import { z } from 'zod';
import { PostalyticsClient } from '../lib/client';
import { spec } from '../spec';

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `List, create, update, or delete outgoing webhooks for campaign event notifications. Webhooks notify your application about mail lifecycle events (created, printed, mailed, delivered, etc.) and online response events (pURL opened, pURL completed). Requires Pro plan or higher.`,
  instructions: [
    'Use action "list" to see all configured webhooks.',
    'Use action "get" to retrieve details for a specific webhook.',
    'Use action "create" to set up a new webhook for a campaign.',
    'Use action "update" to modify a webhook URL or enabled status.',
    'Use action "delete" to remove a webhook.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The action to perform'),
      webhookId: z
        .string()
        .optional()
        .describe('Webhook ID (required for get, update, delete)'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID to receive events from (required for create)'),
      isEnabled: z
        .boolean()
        .optional()
        .describe('Whether the webhook is enabled (for create, update)'),
      url: z
        .string()
        .optional()
        .describe('Endpoint URL to receive webhook events (for create, update)')
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of webhooks'),
      webhook: z.record(z.string(), z.unknown()).optional().describe('Single webhook record'),
      result: z.record(z.string(), z.unknown()).optional().describe('Operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PostalyticsClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let webhooks = await client.getWebhooks();
      return {
        output: { webhooks },
        message: `Found **${webhooks.length}** webhook(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.webhookId) throw new Error('webhookId is required for get action');
      let webhook = await client.getWebhook(ctx.input.webhookId);
      return {
        output: { webhook },
        message: `Retrieved webhook **${ctx.input.webhookId}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.campaignId) throw new Error('campaignId is required for create action');
      if (!ctx.input.url) throw new Error('url is required for create action');
      let result = await client.createWebhook({
        campaignId: ctx.input.campaignId,
        isEnabled: ctx.input.isEnabled ?? true,
        url: ctx.input.url
      });
      return {
        output: { result },
        message: `Webhook created for campaign **${ctx.input.campaignId}** pointing to ${ctx.input.url}.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.webhookId) throw new Error('webhookId is required for update action');
      let result = await client.updateWebhook(ctx.input.webhookId, {
        campaignId: ctx.input.campaignId,
        isEnabled: ctx.input.isEnabled,
        url: ctx.input.url
      });
      return {
        output: { result },
        message: `Webhook **${ctx.input.webhookId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.webhookId) throw new Error('webhookId is required for delete action');
      let result = await client.deleteWebhook(ctx.input.webhookId);
      return {
        output: { result },
        message: `Webhook **${ctx.input.webhookId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
