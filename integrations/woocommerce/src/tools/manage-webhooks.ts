import { SlateTool } from 'slates';
import { z } from 'zod';
import { woocommerceServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let webhookSchema = z.object({
  webhookId: z.number(),
  name: z.string(),
  status: z.string(),
  topic: z.string(),
  resource: z.string(),
  event: z.string(),
  deliveryUrl: z.string(),
  dateCreated: z.string(),
  dateModified: z.string()
});

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `List, get, create, update, or delete WooCommerce webhooks for store events such as order, product, customer, and coupon changes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      webhookId: z.number().optional().describe('Webhook ID (required for get/update/delete)'),
      page: z.number().optional().default(1).describe('Page number for list'),
      perPage: z.number().optional().default(10).describe('Results per page for list'),
      search: z.string().optional().describe('Search webhook names'),
      name: z.string().optional().describe('Webhook name (required for create)'),
      status: z.enum(['active', 'paused', 'disabled']).optional().describe('Webhook status'),
      topic: z
        .string()
        .optional()
        .describe(
          'Webhook topic, such as order.created, product.updated, customer.deleted, coupon.created, or action.<hook>'
        ),
      deliveryUrl: z
        .string()
        .optional()
        .describe('Webhook delivery URL (required for create)'),
      secret: z.string().optional().describe('Optional webhook signing secret'),
      force: z.boolean().optional().default(true).describe('Force permanent deletion')
    })
  )
  .output(
    z.object({
      webhooks: z.array(webhookSchema).optional(),
      webhook: webhookSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {
        page: ctx.input.page,
        per_page: ctx.input.perPage
      };
      if (ctx.input.search) params.search = ctx.input.search;

      let webhooks = await client.listWebhooks(params);
      let mapped = (Array.isArray(webhooks) ? webhooks : []).map((webhook: any) =>
        mapWebhook(webhook)
      );

      return {
        output: { webhooks: mapped },
        message: `Found **${mapped.length}** webhooks.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.webhookId)
        throw woocommerceServiceError('webhookId is required for get action');

      let webhook = await client.getWebhook(ctx.input.webhookId);
      return {
        output: { webhook: mapWebhook(webhook) },
        message: `Retrieved webhook **"${webhook.name}"** (ID: ${webhook.id}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw woocommerceServiceError('name is required for create action');
      if (!ctx.input.topic)
        throw woocommerceServiceError('topic is required for create action');
      if (!ctx.input.deliveryUrl)
        throw woocommerceServiceError('deliveryUrl is required for create action');

      let data = buildWebhookData(ctx.input);
      data.name = ctx.input.name;
      data.topic = ctx.input.topic;
      data.delivery_url = ctx.input.deliveryUrl;

      let webhook = await client.createWebhook(data);
      return {
        output: { webhook: mapWebhook(webhook) },
        message: `Created webhook **"${webhook.name}"** (ID: ${webhook.id}, topic: ${webhook.topic}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.webhookId)
        throw woocommerceServiceError('webhookId is required for update action');

      let data = buildWebhookData(ctx.input);
      let webhook = await client.updateWebhook(ctx.input.webhookId, data);

      return {
        output: { webhook: mapWebhook(webhook) },
        message: `Updated webhook **"${webhook.name}"** (ID: ${webhook.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.webhookId)
        throw woocommerceServiceError('webhookId is required for delete action');

      await client.deleteWebhook(ctx.input.webhookId, ctx.input.force);
      return {
        output: { deleted: true },
        message: `Deleted webhook (ID: ${ctx.input.webhookId}).`
      };
    }

    throw woocommerceServiceError(`Unknown action: ${action}`);
  })
  .build();

let buildWebhookData = (input: any) => {
  let data: Record<string, any> = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.status !== undefined) data.status = input.status;
  if (input.topic !== undefined) data.topic = input.topic;
  if (input.deliveryUrl !== undefined) data.delivery_url = input.deliveryUrl;
  if (input.secret !== undefined) data.secret = input.secret;

  return data;
};

let mapWebhook = (webhook: any) => ({
  webhookId: webhook.id,
  name: webhook.name || '',
  status: webhook.status || '',
  topic: webhook.topic || '',
  resource: webhook.resource || '',
  event: webhook.event || '',
  deliveryUrl: webhook.delivery_url || '',
  dateCreated: webhook.date_created || '',
  dateModified: webhook.date_modified || ''
});
