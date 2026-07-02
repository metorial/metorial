import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let webhookSchema = z.object({
  webhookId: z.string().describe('Unique webhook identifier'),
  url: z.string().optional().describe('Webhook endpoint URL'),
  websiteName: z.string().optional().describe('Associated website name'),
  websiteId: z.string().optional().describe('Associated website ID'),
  version: z.string().optional().describe('API version'),
  enabled: z.boolean().optional().describe('Whether the webhook is enabled'),
  createdDate: z.number().optional().describe('Creation timestamp (Unix epoch)'),
  createdBy: z.string().optional().describe('User who created the webhook')
});

let mapWebhook = (w: any) => ({
  webhookId: w.webhook_id || w.id,
  url: w.url,
  websiteName: w.website,
  websiteId: w.website_id,
  version: w.version,
  enabled: w.enabled,
  createdDate: w.created_date,
  createdBy: w.created_by
});

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `Retrieve all configured webhook endpoints from your LiveSession account. Returns webhook URLs, associated websites, and enabled status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      webhooks: z.array(webhookSchema).describe('List of configured webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listWebhooks();
    let webhooks = (Array.isArray(result) ? result : result.webhooks || []).map(mapWebhook);

    return {
      output: { webhooks },
      message: `Found **${webhooks.length}** webhook endpoints.`
    };
  })
  .build();

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a new webhook endpoint in LiveSession. The endpoint will receive event notifications configured through alerts. Requires Admin or Owner role.`,
  constraints: ['Requires Admin or Owner role to manage webhook settings.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the webhook endpoint to receive events'),
      websiteId: z.string().describe('ID of the website to associate the webhook with'),
      version: z.string().optional().describe('API version (defaults to "v1.0")')
    })
  )
  .output(webhookSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.createWebhook({
      url: ctx.input.url,
      websiteId: ctx.input.websiteId,
      version: ctx.input.version
    });

    let webhook = mapWebhook(result);
    return {
      output: webhook,
      message: `Created webhook endpoint **${webhook.url}** (${webhook.webhookId}).`
    };
  })
  .build();

export let updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description: `Update an existing webhook endpoint configuration. Modify the endpoint URL or enable/disable the webhook.`,
  constraints: ['Requires Admin or Owner role to manage webhook settings.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('ID of the webhook to update'),
      url: z.string().optional().describe('New webhook endpoint URL'),
      enabled: z.boolean().optional().describe('Enable or disable the webhook')
    })
  )
  .output(webhookSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.updateWebhook(ctx.input.webhookId, {
      url: ctx.input.url,
      enabled: ctx.input.enabled
    });

    let webhook = mapWebhook(result);
    return {
      output: webhook,
      message: `Updated webhook **${webhook.webhookId}**.`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Permanently delete a webhook endpoint from LiveSession. Alerts using this webhook will stop delivering notifications.`,
  constraints: ['Requires Admin or Owner role to manage webhook settings.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('ID of the webhook to delete')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('ID of the deleted webhook'),
      deleted: z.boolean().describe('Whether the webhook was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.deleteWebhook(ctx.input.webhookId);

    return {
      output: {
        webhookId: result.webhook_id || ctx.input.webhookId,
        deleted: result.deleted ?? true
      },
      message: `Deleted webhook **${ctx.input.webhookId}**.`
    };
  })
  .build();
