import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

let webhookSchema = z.object({
  webhookId: z.string().describe('Webhook ID'),
  name: z.string().optional().describe('Webhook name'),
  url: z.string().optional().describe('Webhook destination URL'),
  enabled: z.boolean().optional().describe('Whether the webhook is enabled'),
  eventFilter: z.array(z.string()).optional().describe('Subscribed event types')
});

let webhookEventSchema = z.object({
  eventId: z.string().optional().describe('Webhook event ID'),
  eventType: z.string().optional().describe('Event type'),
  status: z.string().optional().describe('Delivery status'),
  sentAt: z.string().optional().describe('Sent timestamp')
});

let mapWebhook = (value: any) => {
  let webhook = value.webhook || value;
  return {
    webhookId: webhook.id,
    name: webhook.name,
    url: webhook.url,
    enabled: webhook.enabled,
    eventFilter: webhook.eventFilter
  };
};

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `List, retrieve, create, update, delete, or inspect delivery events for Render webhooks. Uses Render's current eventFilter field; an empty eventFilter subscribes to all event types.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'list_events'])
        .describe('Webhook action'),
      webhookId: z
        .string()
        .optional()
        .describe('Webhook ID for get/update/delete/list_events'),
      ownerId: z.string().optional().describe('Workspace ID for list/create'),
      name: z.string().optional().describe('Webhook name for create/update'),
      url: z.string().optional().describe('Webhook URL for create/update'),
      enabled: z.boolean().optional().describe('Whether the webhook is enabled'),
      eventFilter: z
        .array(z.string())
        .optional()
        .describe(
          'Event types that trigger the webhook. Empty or omitted means all events on create.'
        ),
      sentBefore: z
        .string()
        .optional()
        .describe('Filter webhook events sent before this time'),
      sentAfter: z.string().optional().describe('Filter webhook events sent after this time'),
      limit: z.number().optional().describe('Maximum results'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      webhooks: z.array(webhookSchema).optional().describe('Webhooks'),
      webhook: webhookSchema.optional().describe('Single webhook'),
      events: z.array(webhookEventSchema).optional().describe('Webhook delivery events'),
      cursor: z.string().optional().describe('Cursor for next page'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.ownerId) params.ownerId = [ctx.input.ownerId];
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.cursor) params.cursor = ctx.input.cursor;
      let data = await client.listWebhooks(params);
      let lastCursor: string | undefined;
      let webhooks = (Array.isArray(data) ? data : []).map((item: any) => {
        lastCursor = item.cursor;
        return mapWebhook(item);
      });
      return {
        output: { webhooks, cursor: lastCursor, success: true },
        message: `Found **${webhooks.length}** webhook(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.ownerId) throw createApiServiceError('ownerId is required for create');
      if (!ctx.input.name) throw createApiServiceError('name is required for create');
      if (!ctx.input.url) throw createApiServiceError('url is required for create');
      let webhook = mapWebhook(
        await client.createWebhook({
          ownerId: ctx.input.ownerId,
          name: ctx.input.name,
          url: ctx.input.url,
          enabled: ctx.input.enabled ?? true,
          eventFilter: ctx.input.eventFilter ?? []
        })
      );
      return {
        output: { webhook, success: true },
        message: `Created webhook **${webhook.name || webhook.webhookId}**.`
      };
    }

    if (!ctx.input.webhookId) {
      throw createApiServiceError('webhookId is required');
    }

    if (action === 'get') {
      let webhook = mapWebhook(await client.getWebhook(ctx.input.webhookId));
      return {
        output: { webhook, success: true },
        message: `Webhook **${webhook.name || webhook.webhookId}**.`
      };
    }

    if (action === 'update') {
      let body: Record<string, any> = {};
      if (ctx.input.name !== undefined) body.name = ctx.input.name;
      if (ctx.input.url !== undefined) body.url = ctx.input.url;
      if (ctx.input.enabled !== undefined) body.enabled = ctx.input.enabled;
      if (ctx.input.eventFilter !== undefined) body.eventFilter = ctx.input.eventFilter;
      let webhook = mapWebhook(await client.updateWebhook(ctx.input.webhookId, body));
      return {
        output: { webhook, success: true },
        message: `Updated webhook **${webhook.name || webhook.webhookId}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteWebhook(ctx.input.webhookId);
      return {
        output: { success: true },
        message: `Deleted webhook \`${ctx.input.webhookId}\`.`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.sentBefore) params.sentBefore = ctx.input.sentBefore;
    if (ctx.input.sentAfter) params.sentAfter = ctx.input.sentAfter;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.cursor) params.cursor = ctx.input.cursor;
    let data = await client.listWebhookEvents(ctx.input.webhookId, params);
    let lastCursor: string | undefined;
    let events = (Array.isArray(data) ? data : []).map((item: any) => {
      lastCursor = item.cursor;
      let event = item.webhookEvent || item.event || item;
      return {
        eventId: event.id,
        eventType: event.eventType || event.type,
        status: event.status,
        sentAt: event.sentAt
      };
    });
    return {
      output: { events, cursor: lastCursor, success: true },
      message: `Found **${events.length}** webhook event(s).`
    };
  })
  .build();
