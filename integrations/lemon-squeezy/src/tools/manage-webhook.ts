import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { lemonSqueezyServiceError } from '../lib/errors';
import { spec } from '../spec';

let WEBHOOK_EVENTS = [
  'order_created',
  'order_refunded',
  'customer_updated',
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_resumed',
  'subscription_expired',
  'subscription_paused',
  'subscription_unpaused',
  'subscription_payment_success',
  'subscription_payment_failed',
  'subscription_payment_recovered',
  'subscription_payment_refunded',
  'license_key_created',
  'license_key_updated',
  'affiliate_activated'
] as const;

let webhookOutputSchema = z.object({
  webhookId: z.string(),
  deleted: z.boolean(),
  storeId: z.number().optional(),
  url: z.string().optional(),
  events: z.array(z.string()).optional(),
  lastSentAt: z.string().nullable().optional(),
  testMode: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

let formatWebhook = (webhook: any) => ({
  webhookId: webhook.id,
  deleted: false,
  storeId: webhook.attributes.store_id,
  url: webhook.attributes.url,
  events: webhook.attributes.events,
  lastSentAt: webhook.attributes.last_sent_at,
  testMode: webhook.attributes.test_mode,
  createdAt: webhook.attributes.created_at,
  updatedAt: webhook.attributes.updated_at
});

export let manageWebhookTool = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description:
    'Create, retrieve, update, or delete a Lemon Squeezy webhook. Use action to choose the operation. Create requires storeId or configured storeId, URL, events, and a signing secret.',
  instructions: [
    'Use action "create" with url, events, secret, and storeId or configured storeId.',
    'Use action "update" with webhookId and at least one of url, events, or secret.',
    'Use action "get" or "delete" with webhookId.'
  ],
  constraints: ['Deleting a webhook is permanent and stops event delivery to that endpoint.']
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('The webhook action'),
      webhookId: z
        .string()
        .optional()
        .describe('Webhook ID for get, update, or delete actions'),
      storeId: z
        .string()
        .optional()
        .describe('Store ID for create. Falls back to the configured store ID if omitted.'),
      url: z.string().optional().describe('HTTPS endpoint URL for create or update'),
      events: z
        .array(z.enum(WEBHOOK_EVENTS))
        .optional()
        .describe('Webhook event types for create or update'),
      secret: z
        .string()
        .optional()
        .describe('Signing secret for create or update. Lemon Squeezy never returns it.'),
      testMode: z.boolean().optional().describe('Create the webhook in test mode')
    })
  )
  .output(
    z.object({
      webhook: webhookOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let webhook: any;

    if (ctx.input.action === 'create') {
      let storeId = ctx.input.storeId || ctx.config.storeId;
      if (!storeId) {
        throw lemonSqueezyServiceError(
          'Store ID is required. Provide it in the input or configure it in the provider settings.'
        );
      }
      if (!ctx.input.url) {
        throw lemonSqueezyServiceError('url is required for create action.');
      }
      if (!ctx.input.events || ctx.input.events.length === 0) {
        throw lemonSqueezyServiceError(
          'events must include at least one event for create action.'
        );
      }
      if (!ctx.input.secret) {
        throw lemonSqueezyServiceError('secret is required for create action.');
      }

      let response = await client.createWebhook(
        storeId,
        ctx.input.url,
        ctx.input.events,
        ctx.input.secret,
        ctx.input.testMode
      );
      webhook = response.data;
    } else {
      if (!ctx.input.webhookId) {
        throw lemonSqueezyServiceError(`${ctx.input.action} action requires webhookId.`);
      }

      if (ctx.input.action === 'delete') {
        await client.deleteWebhook(ctx.input.webhookId);
        return {
          output: {
            webhook: {
              webhookId: ctx.input.webhookId,
              deleted: true
            }
          },
          message: `Deleted webhook **${ctx.input.webhookId}**.`
        };
      }

      if (ctx.input.action === 'update') {
        let attributes: { url?: string; events?: string[]; secret?: string } = {};
        if (ctx.input.url !== undefined) attributes.url = ctx.input.url;
        if (ctx.input.events !== undefined) {
          if (ctx.input.events.length === 0) {
            throw lemonSqueezyServiceError(
              'events must include at least one event when updating.'
            );
          }
          attributes.events = ctx.input.events;
        }
        if (ctx.input.secret !== undefined) attributes.secret = ctx.input.secret;

        if (Object.keys(attributes).length === 0) {
          throw lemonSqueezyServiceError('Provide url, events, or secret for update action.');
        }

        let response = await client.updateWebhook(ctx.input.webhookId, attributes);
        webhook = response.data;
      } else {
        let response = await client.getWebhook(ctx.input.webhookId);
        webhook = response.data;
      }
    }

    let formatted = formatWebhook(webhook);
    let actionLabel =
      ctx.input.action === 'create'
        ? 'Created'
        : ctx.input.action === 'update'
          ? 'Updated'
          : 'Retrieved';

    return {
      output: {
        webhook: formatted
      },
      message: `${actionLabel} webhook **${formatted.webhookId}** for ${formatted.url}.`
    };
  })
  .build();
