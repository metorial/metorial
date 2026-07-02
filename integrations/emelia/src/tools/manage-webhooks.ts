import { SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `List, create, delete, or test campaign activity webhooks. Webhooks notify you of email opens, clicks, and replies.
- **list**: List all webhooks.
- **create**: Create a new webhook for a campaign.
- **delete**: Delete a webhook.
- **test**: Send a test event to a webhook URL.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete', 'test']).describe('Operation to perform'),
      webhookId: z.string().optional().describe('Webhook ID (required for delete, test)'),
      campaignId: z.string().optional().describe('Campaign ID (required for create)'),
      url: z.string().optional().describe('Webhook URL (required for create)'),
      event: z
        .string()
        .optional()
        .describe('Event type to watch: open, click, or reply (required for create)')
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of webhooks'),
      webhook: z.record(z.string(), z.unknown()).optional().describe('Webhook details'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let { action, webhookId, campaignId, url, event } = ctx.input;

    if (action === 'list') {
      let webhooks = await client.listWebhooks();
      let webhookList = Array.isArray(webhooks) ? webhooks : [];
      return {
        output: { webhooks: webhookList, success: true },
        message: `Retrieved **${webhookList.length}** webhook(s).`
      };
    }

    if (action === 'create') {
      if (!campaignId) throw new Error('Campaign ID is required');
      if (!url) throw new Error('Webhook URL is required');
      if (!event) throw new Error('Event type is required');
      let webhook = await client.createWebhook({ campaignId, url, event });
      return {
        output: { webhook, success: true },
        message: `Created webhook for **${event}** events on campaign **${campaignId}**.`
      };
    }

    if (action === 'delete') {
      if (!webhookId) throw new Error('Webhook ID is required');
      await client.deleteWebhook(webhookId);
      return {
        output: { success: true },
        message: `Deleted webhook **${webhookId}**.`
      };
    }

    if (action === 'test') {
      if (!webhookId) throw new Error('Webhook ID is required');
      await client.testWebhook(webhookId);
      return {
        output: { success: true },
        message: `Sent test event to webhook **${webhookId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
