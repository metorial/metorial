import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getMailercloudCount, getMailercloudItems } from '../lib/responses';
import { spec } from '../spec';

let webhookEventTypes = z.enum([
  'send',
  'open',
  'click',
  'fail',
  'spam',
  'unsubscribe',
  'bounce'
]);

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhook',
  description: `Create, list, or delete webhooks in your Mailercloud account. Webhooks send real-time HTTP POST notifications when email events occur (send, open, click, fail, spam, unsubscribe, bounce).`,
  constraints: [
    'Free Plan: up to 20 webhooks and 10,000 events/day.',
    'Premium/Enterprise: up to 50 webhooks with unlimited events/day.',
    'Webhooks are auto-deactivated after 20 consecutive delivery failures.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'delete']).describe('Action to perform'),
      name: z.string().optional().describe('Name of the webhook (required for create)'),
      url: z
        .string()
        .optional()
        .describe('Target URL for the webhook (required for create, must be HTTP or HTTPS)'),
      events: z
        .array(webhookEventTypes)
        .optional()
        .describe('Event types to subscribe to (required for create)'),
      webhookId: z
        .string()
        .optional()
        .describe('ID of the webhook to delete (required for delete)'),
      page: z.number().int().min(1).optional().describe('Page for list action (default: 1)'),
      limit: z
        .number()
        .int()
        .min(10)
        .max(100)
        .optional()
        .describe('Page size for list action (default: 20)'),
      search: z.string().optional().describe('Name search for list action')
    })
  )
  .output(
    z
      .object({
        webhookId: z.string().optional().describe('ID of the created or deleted webhook'),
        webhooks: z
          .array(z.record(z.string(), z.unknown()))
          .optional()
          .describe('List of webhooks (for list action)'),
        action: z.string().describe('Action that was performed'),
        totalCount: z.number().optional().describe('Total matching webhooks for list action')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listWebhooks(ctx.input);
      let data = result?.data ?? result;
      let webhooks = getMailercloudItems(data?.webhooks ?? data?.data ?? data);

      return {
        output: {
          webhooks,
          action: 'listed',
          totalCount: getMailercloudCount(result?.total ?? result?.count, webhooks.length)
        },
        message: `Retrieved **${webhooks.length}** webhook(s).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.webhookId) {
        throw createApiServiceError('webhookId is required for delete action.');
      }
      await client.deleteWebhook(ctx.input.webhookId);
      return {
        output: {
          webhookId: ctx.input.webhookId,
          action: 'deleted'
        },
        message: `Successfully deleted webhook \`${ctx.input.webhookId}\`.`
      };
    }

    if (!ctx.input.name || !ctx.input.url || !ctx.input.events?.length) {
      throw createApiServiceError(
        'name, url, and at least one event are required for create action.'
      );
    }

    if (!/^https?:\/\//i.test(ctx.input.url) || !URL.canParse(ctx.input.url)) {
      throw createApiServiceError('Webhook URL must be a valid HTTP or HTTPS URL.');
    }

    let result = await client.createWebhook({
      name: ctx.input.name,
      url: ctx.input.url,
      events: ctx.input.events
    });

    let data = result?.data ?? result;

    return {
      output: {
        webhookId: data?.id ?? data?.enc_id ?? undefined,
        action: 'created',
        ...data
      },
      message: `Successfully created webhook **${ctx.input.name}** listening for events: ${ctx.input.events.join(', ')}.`
    };
  })
  .build();
