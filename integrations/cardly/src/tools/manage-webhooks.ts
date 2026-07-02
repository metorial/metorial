import { SlateTool } from 'slates';
import { z } from 'zod';
import { CardlyClient } from '../lib/client';
import { spec } from '../spec';

let eventTypes = [
  'contact.order.created',
  'contact.order.sent',
  'contact.order.refunded',
  'giftCard.redeemed',
  'qrCode.scanned',
  'contact.undeliverable',
  'contact.changeOfAddress',
  'consignment.undeliverable',
  'consignment.changeOfAddress'
] as const;

let webhookOutputSchema = z.object({
  webhookId: z.string().describe('Unique webhook ID'),
  url: z.string().describe('Target URL for webhook POST requests'),
  events: z.array(z.string()).describe('Subscribed event types'),
  enabled: z.boolean().describe('Whether the webhook is currently enabled'),
  secret: z
    .string()
    .optional()
    .describe('Secret key for signature verification (only returned on creation)'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Custom metadata'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

let mapWebhook = (w: Record<string, unknown>) => ({
  webhookId: w.id as string,
  url: w.url as string,
  events: w.events as string[],
  enabled: w.enabled as boolean,
  secret: w.secret as string | undefined,
  metadata: w.metadata as Record<string, unknown> | undefined,
  createdAt: w.createdAt as string,
  updatedAt: w.updatedAt as string
});

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `Retrieve all webhooks configured for your organisation, including their target URLs, subscribed events, and enabled status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results (default 25)'),
      offset: z.number().optional().describe('Number of records to skip')
    })
  )
  .output(
    z.object({
      webhooks: z.array(webhookOutputSchema).describe('Configured webhooks'),
      totalRecords: z.number().describe('Total number of webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let result = await client.listWebhooks({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let webhooks = result.webhooks.map(w =>
      mapWebhook(w as unknown as Record<string, unknown>)
    );

    return {
      output: {
        webhooks,
        totalRecords: result.meta.totalRecords
      },
      message: `Found **${webhooks.length}** webhook(s) (${result.meta.totalRecords} total).`
    };
  })
  .build();

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a new webhook subscription. The webhook will receive POST requests to the target URL for the specified event types. A secret key is returned once at creation for signature verification.

Available events: \`contact.order.created\`, \`contact.order.sent\`, \`contact.order.refunded\`, \`giftCard.redeemed\`, \`qrCode.scanned\`, \`contact.undeliverable\`, \`contact.changeOfAddress\`, \`consignment.undeliverable\`, \`consignment.changeOfAddress\`.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('Target URL to receive webhook POST requests'),
      events: z.array(z.enum(eventTypes)).min(1).describe('Event types to subscribe to'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether to enable the webhook immediately (defaults to true)'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata to attach to the webhook')
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let webhook = await client.createWebhook({
      url: ctx.input.url,
      events: ctx.input.events,
      enabled: ctx.input.enabled,
      metadata: ctx.input.metadata
    });

    return {
      output: mapWebhook(webhook as unknown as Record<string, unknown>),
      message: `Webhook created with ID **${webhook.id}** targeting **${webhook.url}** for ${webhook.events.length} event(s).${webhook.secret ? ' **Save the secret key** — it will not be shown again.' : ''}`
    };
  })
  .build();

export let updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description: `Update an existing webhook's target URL, subscribed events, enabled status, or metadata. Only provide the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('UUID of the webhook to update'),
      url: z.string().optional().describe('New target URL'),
      events: z.array(z.enum(eventTypes)).optional().describe('Updated event types'),
      enabled: z.boolean().optional().describe('Enable or disable the webhook'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated custom metadata')
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let webhook = await client.updateWebhook(ctx.input.webhookId, {
      url: ctx.input.url,
      events: ctx.input.events,
      enabled: ctx.input.enabled,
      metadata: ctx.input.metadata
    });

    return {
      output: mapWebhook(webhook as unknown as Record<string, unknown>),
      message: `Webhook **${webhook.id}** updated. Enabled: **${webhook.enabled}**, ${webhook.events.length} event(s).`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Permanently delete a webhook subscription. The webhook will stop receiving event notifications.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('UUID of the webhook to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the webhook was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });
    await client.deleteWebhook(ctx.input.webhookId);

    return {
      output: { deleted: true },
      message: `Webhook **${ctx.input.webhookId}** deleted successfully.`
    };
  })
  .build();
