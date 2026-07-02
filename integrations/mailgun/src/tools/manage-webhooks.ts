import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailgunClient } from '../lib/client';
import { spec } from '../spec';

// ==================== List Webhooks ====================

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List all configured webhooks for a domain. Shows which event types have webhook URLs configured.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to list webhooks for')
    })
  )
  .output(
    z.object({
      webhooks: z
        .record(
          z.string(),
          z.object({
            urls: z.array(z.string()).describe('Webhook URLs for this event type')
          })
        )
        .describe('Webhooks keyed by event type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.listWebhooks(ctx.input.domain);

    let webhookCount = Object.keys(result.webhooks || {}).length;

    return {
      output: { webhooks: result.webhooks || {} },
      message: `Found **${webhookCount}** webhook event type(s) configured for **${ctx.input.domain}**.`
    };
  })
  .build();

// ==================== Create Webhook ====================

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a webhook for a specific event type on a domain. Mailgun will POST event data to the specified URL when events of the given type occur.`,
  constraints: ['Up to 3 URLs per event type.'],
  tags: { destructive: false }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      eventType: z
        .enum([
          'accepted',
          'delivered',
          'opened',
          'clicked',
          'unsubscribed',
          'complained',
          'permanent_fail',
          'temporary_fail'
        ])
        .describe('Event type to trigger the webhook'),
      url: z.string().describe('URL to receive webhook POST requests')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.createWebhook(ctx.input.domain, {
      id: ctx.input.eventType,
      url: ctx.input.url
    });

    return {
      output: { success: true },
      message: `Webhook for **${ctx.input.eventType}** events created on **${ctx.input.domain}**.`
    };
  })
  .build();

// ==================== Delete Webhook ====================

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Delete a webhook for a specific event type on a domain.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name'),
      eventType: z
        .enum([
          'accepted',
          'delivered',
          'opened',
          'clicked',
          'unsubscribed',
          'complained',
          'permanent_fail',
          'temporary_fail'
        ])
        .describe('Event type webhook to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.deleteWebhook(ctx.input.domain, ctx.input.eventType);

    return {
      output: { success: true },
      message: `Webhook for **${ctx.input.eventType}** events deleted from **${ctx.input.domain}**.`
    };
  })
  .build();
