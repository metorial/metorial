import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { activeCampaignServiceError } from '../lib/errors';
import { spec } from '../spec';

let webhookEventSchema = z.enum([
  'forward',
  'open',
  'share',
  'sent',
  'subscribe',
  'subscriber_note',
  'contact_tag_added',
  'contact_tag_removed',
  'unsubscribe',
  'update',
  'deal_add',
  'deal_note_add',
  'deal_pipeline_add',
  'deal_stage_add',
  'deal_task_add',
  'deal_task_complete',
  'deal_tasktype_add',
  'deal_update',
  'bounce',
  'reply',
  'click',
  'list_add',
  'sms_reply',
  'sms_sent',
  'sms_unsub'
]);

let webhookSourceSchema = z.enum(['public', 'admin', 'api', 'system']);

let mapWebhook = (webhook: any) => ({
  webhookId: webhook.id,
  name: webhook.name || undefined,
  url: webhook.url || undefined,
  events: Array.isArray(webhook.events) ? webhook.events : undefined,
  sources: Array.isArray(webhook.sources) ? webhook.sources : undefined,
  listId: webhook.listid || webhook.list || undefined
});

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description:
    'Creates, lists, or deletes ActiveCampaign webhooks for contact, campaign, deal, list, and SMS events.',
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'delete']).describe('Action to perform'),
      webhookId: z.string().optional().describe('Webhook ID required for delete'),
      name: z.string().optional().describe('Webhook name required for create'),
      url: z.string().optional().describe('Destination URL required for create'),
      events: z
        .array(webhookEventSchema)
        .optional()
        .describe('Webhook events required for create'),
      sources: z
        .array(webhookSourceSchema)
        .optional()
        .describe('Webhook sources required for create'),
      listId: z.string().optional().describe('Optional list ID to scope the webhook'),
      limit: z.number().optional().describe('Maximum number of webhooks to return for list'),
      offset: z.number().optional().describe('Pagination offset for list')
    })
  )
  .output(
    z.object({
      webhook: z
        .object({
          webhookId: z.string(),
          name: z.string().optional(),
          url: z.string().optional(),
          events: z.array(z.string()).optional(),
          sources: z.array(z.string()).optional(),
          listId: z.string().optional()
        })
        .optional(),
      webhooks: z
        .array(
          z.object({
            webhookId: z.string(),
            name: z.string().optional(),
            url: z.string().optional(),
            events: z.array(z.string()).optional(),
            sources: z.array(z.string()).optional(),
            listId: z.string().optional()
          })
        )
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    switch (ctx.input.action) {
      case 'create': {
        if (
          !ctx.input.name ||
          !ctx.input.url ||
          !ctx.input.events?.length ||
          !ctx.input.sources?.length
        ) {
          throw activeCampaignServiceError(
            'name, url, events, and sources are required for creating a webhook'
          );
        }

        let result = await client.createWebhook({
          name: ctx.input.name,
          url: ctx.input.url,
          events: ctx.input.events,
          sources: ctx.input.sources,
          listid: ctx.input.listId
        });
        let webhook = mapWebhook(result.webhook);

        return {
          output: { webhook },
          message: `Webhook **${webhook.name || webhook.webhookId}** created.`
        };
      }
      case 'delete': {
        if (!ctx.input.webhookId) {
          throw activeCampaignServiceError('webhookId is required for deleting a webhook');
        }

        await client.deleteWebhook(ctx.input.webhookId);
        return {
          output: { deleted: true },
          message: `Webhook (ID: ${ctx.input.webhookId}) deleted.`
        };
      }
      case 'list': {
        let params: Record<string, any> = {};
        if (ctx.input.limit) params.limit = ctx.input.limit;
        if (ctx.input.offset) params.offset = ctx.input.offset;

        let result = await client.listWebhooks(params);
        let webhooks = (result.webhooks || []).map(mapWebhook);

        return {
          output: { webhooks },
          message: `Found **${webhooks.length}** webhooks.`
        };
      }
    }
  })
  .build();
