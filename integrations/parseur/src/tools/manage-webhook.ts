import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Create, enable, disable, or delete webhooks for Parseur mailboxes. Webhooks push parsed data to your endpoint when documents are processed or when processing fails.`,
  instructions: [
    'To create a webhook, provide event and targetUrl. Then enable it on a specific mailbox using the enable action.',
    'Webhook events: document.processed, document.processed.flattened, table.processed, document.template_needed, document.export_failed.',
    'Webhooks are global — enabling/disabling is done per-mailbox.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'enable', 'disable', 'delete']).describe('Action to perform'),
      webhookId: z
        .number()
        .optional()
        .describe('Webhook ID (required for enable, disable, delete)'),
      mailboxId: z.number().optional().describe('Mailbox ID (required for enable, disable)'),
      event: z
        .enum([
          'document.processed',
          'document.processed.flattened',
          'table.processed',
          'document.template_needed',
          'document.export_failed'
        ])
        .optional()
        .describe('Webhook trigger event (required for create)'),
      targetUrl: z
        .string()
        .optional()
        .describe('Target URL for webhook delivery (required for create, HTTPS recommended)'),
      name: z.string().optional().describe('Webhook name (for create)'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom HTTP headers for webhook requests (for create)')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action performed'),
      success: z.boolean().describe('Whether the action succeeded'),
      webhookId: z.number().nullable().describe('Webhook ID'),
      resultMessage: z.string().describe('Status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, webhookId, mailboxId, event, targetUrl, name, headers } = ctx.input;

    let resultWebhookId: number | null = webhookId || null;
    let resultMessage = '';

    switch (action) {
      case 'create': {
        if (!event || !targetUrl) {
          throw new Error('event and targetUrl are required for create action');
        }
        let webhook = await client.createWebhook({
          event,
          target: targetUrl,
          name,
          headers
        });
        resultWebhookId = webhook.id;
        resultMessage = `Webhook created (ID: ${webhook.id}). Enable it on a mailbox to start receiving events.`;
        break;
      }
      case 'enable': {
        if (!mailboxId || !webhookId) {
          throw new Error('mailboxId and webhookId are required for enable action');
        }
        await client.enableWebhook(mailboxId, webhookId);
        resultMessage = `Webhook ${webhookId} enabled on mailbox ${mailboxId}`;
        break;
      }
      case 'disable': {
        if (!mailboxId || !webhookId) {
          throw new Error('mailboxId and webhookId are required for disable action');
        }
        await client.disableWebhook(mailboxId, webhookId);
        resultMessage = `Webhook ${webhookId} disabled on mailbox ${mailboxId}`;
        break;
      }
      case 'delete': {
        if (!webhookId) {
          throw new Error('webhookId is required for delete action');
        }
        await client.deleteWebhook(webhookId);
        resultMessage = `Webhook ${webhookId} deleted`;
        break;
      }
    }

    return {
      output: {
        action,
        success: true,
        webhookId: resultWebhookId,
        resultMessage
      },
      message: `**${action}**: ${resultMessage}`
    };
  })
  .build();
