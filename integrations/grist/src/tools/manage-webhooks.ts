import { SlateTool } from 'slates';
import { z } from 'zod';
import { GristClient } from '../lib/client';
import { spec } from '../spec';

let webhookSchema = z.object({
  webhookId: z.string().describe('Webhook ID'),
  url: z.string().optional().describe('Webhook target URL'),
  tableId: z.string().optional().describe('Monitored table ID'),
  eventTypes: z.array(z.string()).optional().describe('Event types (e.g., "add", "update")'),
  enabled: z.boolean().optional().describe('Whether the webhook is enabled'),
  name: z.string().optional().describe('Webhook name'),
  memo: z.string().optional().describe('Webhook memo/description'),
  readyColId: z.string().optional().describe('Ready column ID'),
  isReadyColumn: z.boolean().optional().describe('Whether the webhook uses a ready column'),
  fields: z.record(z.string(), z.any()).optional().describe('All webhook fields')
});

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List all webhooks configured for a document, including their URLs, target tables, event types, and delivery status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID')
    })
  )
  .output(
    z.object({
      webhooks: z.array(webhookSchema).describe('List of webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let result = await client.listWebhooks(ctx.input.documentId);
    let webhooks = (result.webhooks || []).map((w: any) => ({
      webhookId: w.id,
      url: w.fields?.url,
      tableId: w.fields?.tableId,
      eventTypes: w.fields?.eventTypes,
      enabled: w.fields?.enabled,
      name: w.fields?.name,
      memo: w.fields?.memo,
      readyColId: w.fields?.readyColId,
      isReadyColumn: w.fields?.isReadyColumn,
      fields: w.fields
    }));

    return {
      output: { webhooks },
      message: `Found **${webhooks.length}** webhook(s) for document **${ctx.input.documentId}**.`
    };
  })
  .build();

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a webhook that sends POST requests to a URL when data changes in a document table. Supports filtering by event types (add, update) and gating with a ready column.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      url: z.string().describe('URL to receive webhook POST requests'),
      tableId: z.string().describe('Table ID to monitor for changes'),
      eventTypes: z.array(z.enum(['add', 'update'])).describe('Event types to listen for'),
      name: z.string().optional().describe('Webhook name'),
      memo: z.string().optional().describe('Webhook memo/description'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the webhook is enabled (default: true)'),
      readyColId: z
        .string()
        .optional()
        .describe('Boolean column ID that gates when the webhook fires')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('ID of the created webhook')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let fields: Record<string, any> = {
      url: ctx.input.url,
      tableId: ctx.input.tableId,
      eventTypes: ctx.input.eventTypes
    };
    if (ctx.input.name !== undefined) fields.name = ctx.input.name;
    if (ctx.input.memo !== undefined) fields.memo = ctx.input.memo;
    if (ctx.input.enabled !== undefined) fields.enabled = ctx.input.enabled;
    if (ctx.input.readyColId !== undefined) fields.readyColId = ctx.input.readyColId;

    let result = await client.createWebhooks(ctx.input.documentId, [{ fields }]);
    let webhookId = result.webhooks?.[0]?.id || '';

    return {
      output: { webhookId },
      message: `Created webhook **${webhookId}** monitoring table **${ctx.input.tableId}** for [${ctx.input.eventTypes.join(', ')}] events.`
    };
  })
  .build();

export let updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description: `Update an existing webhook's configuration such as URL, event types, enabled state, or ready column.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      webhookId: z.string().describe('Webhook ID to update'),
      url: z.string().optional().describe('New webhook target URL'),
      tableId: z.string().optional().describe('New table ID to monitor'),
      eventTypes: z
        .array(z.enum(['add', 'update']))
        .optional()
        .describe('New event types to listen for'),
      name: z.string().optional().describe('New webhook name'),
      memo: z.string().optional().describe('New webhook memo'),
      enabled: z.boolean().optional().describe('Enable or disable the webhook'),
      readyColId: z.string().optional().describe('New ready column ID')
    })
  )
  .output(
    z.object({
      updated: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let fields: Record<string, any> = {};
    if (ctx.input.url !== undefined) fields.url = ctx.input.url;
    if (ctx.input.tableId !== undefined) fields.tableId = ctx.input.tableId;
    if (ctx.input.eventTypes !== undefined) fields.eventTypes = ctx.input.eventTypes;
    if (ctx.input.name !== undefined) fields.name = ctx.input.name;
    if (ctx.input.memo !== undefined) fields.memo = ctx.input.memo;
    if (ctx.input.enabled !== undefined) fields.enabled = ctx.input.enabled;
    if (ctx.input.readyColId !== undefined) fields.readyColId = ctx.input.readyColId;

    await client.updateWebhook(ctx.input.documentId, ctx.input.webhookId, fields);

    return {
      output: { updated: true },
      message: `Updated webhook **${ctx.input.webhookId}**.`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Delete a webhook from a document. Optionally clear the pending delivery queue for a specific webhook or all webhooks.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID'),
      webhookId: z.string().describe('Webhook ID to delete'),
      clearQueue: z.boolean().optional().describe('Also clear pending deliveries in the queue')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the webhook was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    if (ctx.input.clearQueue) {
      await client.clearWebhookQueue(ctx.input.documentId, ctx.input.webhookId);
    }

    await client.deleteWebhook(ctx.input.documentId, ctx.input.webhookId);

    return {
      output: { deleted: true },
      message: `Deleted webhook **${ctx.input.webhookId}**${ctx.input.clearQueue ? ' and cleared its queue' : ''}.`
    };
  })
  .build();
