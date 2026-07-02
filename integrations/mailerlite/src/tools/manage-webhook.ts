import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mailerLiteServiceError } from '../lib/errors';
import { spec } from '../spec';

let webhookEventSchema = z.enum([
  'subscriber.created',
  'subscriber.updated',
  'subscriber.unsubscribed',
  'subscriber.added_to_group',
  'subscriber.removed_from_group',
  'subscriber.bounced',
  'subscriber.automation_triggered',
  'subscriber.automation_completed',
  'subscriber.spam_reported',
  'subscriber.deleted',
  'subscriber.active',
  'campaign.sent',
  'campaign.click',
  'campaign.open'
]);

let webhookOutputSchema = z.object({
  webhookId: z.string().describe('Webhook ID'),
  name: z.string().optional().nullable().describe('Webhook name'),
  url: z.string().optional().describe('Webhook URL'),
  events: z.array(z.string()).optional().describe('Subscribed event names'),
  enabled: z.boolean().optional().describe('Whether the webhook is enabled'),
  batchable: z.boolean().optional().describe('Whether MailerLite batches webhook events'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Update timestamp')
});

let mapWebhook = (webhook: any) => ({
  webhookId: String(webhook.id),
  name: webhook.name,
  url: webhook.url,
  events: webhook.events,
  enabled: webhook.enabled,
  batchable: webhook.batchable,
  createdAt: webhook.created_at,
  updatedAt: webhook.updated_at
});

let requireWebhookId = (webhookId: string | undefined, action: string) => {
  if (!webhookId) {
    throw mailerLiteServiceError(`webhookId is required for ${action} action.`);
  }

  return webhookId;
};

let requireEvents = (events: string[] | undefined, action: string) => {
  if (!events?.length) {
    throw mailerLiteServiceError(`events are required for ${action} action.`);
  }

  return events;
};

let requiresBatchable = (events: string[] | undefined) =>
  events?.some(
    event =>
      event === 'campaign.open' || event === 'campaign.click' || event === 'subscriber.deleted'
  ) ?? false;

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Lists, gets, creates, updates, or deletes MailerLite webhooks for subscriber and campaign events. For campaign.open, campaign.click, and subscriber.deleted events, MailerLite requires batchable to be true.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Webhook action to perform'),
      webhookId: z.string().optional().describe('Webhook ID for get, update, or delete'),
      name: z.string().optional().describe('Webhook name for create or update'),
      url: z.string().optional().describe('Webhook callback URL for create or update'),
      events: z
        .array(webhookEventSchema)
        .optional()
        .describe('MailerLite event names for create or update'),
      enabled: z.boolean().optional().describe('Whether the webhook is enabled'),
      batchable: z
        .boolean()
        .optional()
        .describe('Whether MailerLite should batch webhook events')
    })
  )
  .output(
    z.object({
      webhooks: z.array(webhookOutputSchema).optional().describe('Webhook list'),
      webhook: webhookOutputSchema
        .optional()
        .describe('Created, retrieved, or updated webhook'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listWebhooks();
      let webhooks = (result.data || []).map(mapWebhook);
      return {
        output: { webhooks, success: true },
        message: `Retrieved **${webhooks.length}** MailerLite webhooks.`
      };
    }

    if (ctx.input.action === 'get') {
      let webhookId = requireWebhookId(ctx.input.webhookId, 'get');
      let result = await client.getWebhook(webhookId);
      let webhook = mapWebhook(result.data);
      return {
        output: { webhook, success: true },
        message: `Retrieved webhook **${webhook.webhookId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.url) {
        throw mailerLiteServiceError('url is required for create action.');
      }

      let events = requireEvents(ctx.input.events, 'create');
      let batchable = requiresBatchable(events) ? true : ctx.input.batchable;
      let result = await client.createWebhook({
        name: ctx.input.name,
        url: ctx.input.url,
        events,
        enabled: ctx.input.enabled,
        batchable
      });
      let webhook = mapWebhook(result.data);

      return {
        output: { webhook, success: true },
        message: `Created webhook **${webhook.webhookId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let webhookId = requireWebhookId(ctx.input.webhookId, 'update');
      let batchable =
        ctx.input.batchable ?? (requiresBatchable(ctx.input.events) ? true : undefined);
      let result = await client.updateWebhook(webhookId, {
        name: ctx.input.name,
        url: ctx.input.url,
        events: ctx.input.events,
        enabled: ctx.input.enabled,
        batchable
      });
      let webhook = mapWebhook(result.data);

      return {
        output: { webhook, success: true },
        message: `Updated webhook **${webhook.webhookId}**.`
      };
    }

    let webhookId = requireWebhookId(ctx.input.webhookId, 'delete');
    await client.deleteWebhook(webhookId);

    return {
      output: { success: true },
      message: `Deleted webhook **${webhookId}**.`
    };
  })
  .build();
