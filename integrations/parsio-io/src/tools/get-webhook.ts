import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWebhook = SlateTool.create(spec, {
  name: 'Get Webhook',
  key: 'get_webhook',
  description:
    'Inspect one webhook by ID. Use list_webhooks to discover webhook IDs for a mailbox.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      webhookId: z.string().min(1).describe('Webhook ID from list_webhooks')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('Webhook ID'),
      name: z.string().optional().describe('Webhook name'),
      url: z.string().optional().describe('Destination URL'),
      event: z.string().optional().describe('Delivery event'),
      enabled: z.boolean().optional().describe('Whether delivery is enabled'),
      tableId: z.string().optional().describe('Table field ID for table.parsed events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let webhook = await client.getWebhook(ctx.input.webhookId);
    if (!webhook || typeof webhook !== 'object' || Array.isArray(webhook)) {
      throw createApiServiceError('Parsio returned an unexpected webhook response.', {
        reason: 'invalid_webhook_response'
      });
    }
    return {
      output: {
        webhookId: webhook._id || webhook.id || ctx.input.webhookId,
        name: webhook.name ?? undefined,
        url: webhook.url ?? undefined,
        event: webhook.event ?? undefined,
        enabled: webhook.enabled ?? undefined,
        tableId: webhook.table_id || webhook.tableId || undefined
      },
      message: `Retrieved webhook **${ctx.input.webhookId}**.`
    };
  })
  .build();
