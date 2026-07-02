import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

let webhookTriggerSchema = z.enum([
  'form_submission',
  'site_publish',
  'page_created',
  'page_metadata_updated',
  'page_deleted',
  'ecomm_new_order',
  'ecomm_order_changed',
  'ecomm_inventory_changed',
  'user_account_added',
  'user_account_updated',
  'user_account_deleted',
  'collection_item_created',
  'collection_item_changed',
  'collection_item_deleted',
  'collection_item_unpublished'
]);

let webhookOutputSchema = z.object({
  webhookId: z.string().optional().describe('Webhook identifier'),
  siteId: z.string().optional().describe('Site that owns the webhook'),
  triggerType: z.string().optional().describe('Webhook trigger type'),
  url: z.string().optional().describe('Webhook destination URL'),
  filter: z.any().optional().describe('Webhook filter configuration'),
  createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
  lastUpdated: z.string().optional().describe('ISO 8601 last update timestamp')
});

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `List, retrieve, create, or delete Webflow webhooks for a site. Creating webhooks requires an OAuth Data Client App token with sites:write scope; Site API tokens may not be accepted by Webflow for webhook creation.`,
  instructions: [
    'Set action to "list" with siteId to list site webhooks.',
    'Set action to "get" with webhookId to retrieve one webhook.',
    'Set action to "create" with siteId, triggerType, url, and optional filter.',
    'Set action to "delete" with webhookId to remove a webhook.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'delete'])
        .describe('Webhook management action to perform'),
      siteId: z.string().optional().describe('Site ID required for list and create actions'),
      webhookId: z
        .string()
        .optional()
        .describe('Webhook ID required for get and delete actions'),
      triggerType: webhookTriggerSchema
        .optional()
        .describe('Trigger type required when creating a webhook'),
      url: z.string().url().optional().describe('Destination URL required for create action'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional Webflow webhook filter object')
    })
  )
  .output(
    z.object({
      webhooks: z.array(webhookOutputSchema).optional().describe('Webhook list'),
      webhook: webhookOutputSchema.optional().describe('Webhook details'),
      deleted: z.boolean().optional().describe('Whether the webhook was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let { action, siteId, webhookId, triggerType, url, filter } = ctx.input;

    if (action === 'list') {
      if (!siteId) throw createApiServiceError('siteId is required for list action.');
      let data = await client.listWebhooks(siteId);
      let webhooks = (data.webhooks ?? []).map((webhook: any) => ({
        webhookId: webhook.id ?? webhook._id,
        siteId: webhook.siteId ?? siteId,
        triggerType: webhook.triggerType,
        url: webhook.url,
        filter: webhook.filter,
        createdOn: webhook.createdOn,
        lastUpdated: webhook.lastUpdated
      }));

      return {
        output: { webhooks },
        message: `Found **${webhooks.length}** webhook(s) for site **${siteId}**.`
      };
    }

    if (action === 'get') {
      if (!webhookId) throw createApiServiceError('webhookId is required for get action.');
      let webhook = await client.getWebhook(webhookId);
      return {
        output: {
          webhook: {
            webhookId: webhook.id ?? webhook._id ?? webhookId,
            siteId: webhook.siteId,
            triggerType: webhook.triggerType,
            url: webhook.url,
            filter: webhook.filter,
            createdOn: webhook.createdOn,
            lastUpdated: webhook.lastUpdated
          }
        },
        message: `Retrieved webhook **${webhookId}**.`
      };
    }

    if (action === 'delete') {
      if (!webhookId) throw createApiServiceError('webhookId is required for delete action.');
      await client.deleteWebhook(webhookId);
      return {
        output: { webhook: { webhookId }, deleted: true },
        message: `Deleted webhook **${webhookId}**.`
      };
    }

    if (!siteId) throw createApiServiceError('siteId is required for create action.');
    if (!triggerType)
      throw createApiServiceError('triggerType is required for create action.');
    if (!url) throw createApiServiceError('url is required for create action.');

    let webhook = await client.createWebhook(siteId, { triggerType, url, filter });
    return {
      output: {
        webhook: {
          webhookId: webhook.id ?? webhook._id,
          siteId: webhook.siteId ?? siteId,
          triggerType: webhook.triggerType,
          url: webhook.url,
          filter: webhook.filter,
          createdOn: webhook.createdOn,
          lastUpdated: webhook.lastUpdated
        }
      },
      message: `Created ${triggerType} webhook for site **${siteId}**.`
    };
  })
  .build();
