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

// ==================== Get Webhook ====================

export let getWebhook = SlateTool.create(spec, {
  name: 'Get Webhook',
  key: 'get_webhook',
  description: `Get configured webhook URLs for one Mailgun domain event type.`,
  tags: { readOnly: true }
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
        .describe('Event type webhook to retrieve')
    })
  )
  .output(
    z.object({
      webhook: z.unknown().describe('Webhook details returned by Mailgun')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getWebhook(ctx.input.domain, ctx.input.eventType);

    return {
      output: { webhook: result },
      message: `Retrieved webhook for **${ctx.input.eventType}** events on **${ctx.input.domain}**.`
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

// ==================== Update Webhook ====================

export let updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description: `Replace the webhook URL list for a Mailgun domain event type with a new URL.`,
  constraints: ['Mailgun replaces the URL list for the event type with the provided URL.'],
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
        .describe('Event type to update'),
      url: z.string().describe('Webhook URL to set')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.updateWebhook(ctx.input.domain, ctx.input.eventType, ctx.input.url);

    return {
      output: { success: true },
      message: `Webhook for **${ctx.input.eventType}** events updated on **${ctx.input.domain}**.`
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
