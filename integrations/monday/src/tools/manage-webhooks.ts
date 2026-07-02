import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

let webhookEventSchema = z.enum([
  'change_column_value',
  'change_status_column_value',
  'change_subitem_column_value',
  'change_specific_column_value',
  'change_name',
  'create_item',
  'item_archived',
  'item_deleted',
  'item_moved_to_any_group',
  'item_moved_to_specific_group',
  'item_restored',
  'create_subitem',
  'change_subitem_name',
  'move_subitem',
  'subitem_archived',
  'subitem_deleted',
  'create_column',
  'create_update',
  'edit_update',
  'delete_update',
  'create_subitem_update'
]);

let webhookSchema = z.object({
  webhookId: z.string().describe('Webhook ID'),
  boardId: z.string().describe('Board ID'),
  event: z.string().nullable().describe('Subscribed event'),
  config: z.string().nullable().describe('Webhook config JSON string')
});

let mapWebhook = (webhook: any) => ({
  webhookId: String(webhook.id),
  boardId: String(webhook.board_id),
  event: webhook.event || null,
  config: webhook.config || null
});

export let listWebhooksTool = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List webhooks configured on a board.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      boardId: z.string().describe('Board ID whose webhooks should be listed'),
      appWebhooksOnly: z
        .boolean()
        .optional()
        .describe('Return only webhooks created by the calling app')
    })
  )
  .output(
    z.object({
      webhooks: z.array(webhookSchema).describe('Webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let webhooks = await client.getWebhooks(ctx.input.boardId, {
      appWebhooksOnly: ctx.input.appWebhooksOnly
    });
    let mapped = webhooks.map(mapWebhook);

    return {
      output: { webhooks: mapped },
      message: `Found **${mapped.length}** webhook(s) on board ${ctx.input.boardId}.`
    };
  })
  .build();

export let createWebhookTool = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a webhook subscription on a board. The URL must respond to monday.com's challenge verification.`
})
  .input(
    z.object({
      boardId: z.string().describe('Board ID to subscribe to'),
      url: z
        .string()
        .url()
        .max(255)
        .describe('Webhook callback URL that can pass monday.com verification'),
      event: webhookEventSchema.describe('Webhook event type'),
      config: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional event-specific webhook config')
    })
  )
  .output(webhookSchema)
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let webhook = await client.createWebhook(
      ctx.input.boardId,
      ctx.input.url,
      ctx.input.event,
      ctx.input.config
    );

    return {
      output: mapWebhook(webhook),
      message: `Created webhook ${webhook.id} on board ${ctx.input.boardId}.`
    };
  })
  .build();

export let deleteWebhookTool = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Delete a webhook subscription.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      webhookId: z.string().describe('Webhook ID to delete')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('Deleted webhook ID'),
      boardId: z.string().nullable().describe('Board ID'),
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let webhook = await client.deleteWebhook(ctx.input.webhookId);

    return {
      output: {
        webhookId: String(webhook.id ?? ctx.input.webhookId),
        boardId: webhook.board_id ? String(webhook.board_id) : null,
        success: true
      },
      message: `Deleted webhook ${ctx.input.webhookId}.`
    };
  })
  .build();
