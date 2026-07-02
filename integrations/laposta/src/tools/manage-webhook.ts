import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let webhookOutputSchema = z.object({
  webhookId: z.string().describe('Unique identifier of the webhook'),
  listId: z.string().describe('ID of the list the webhook is bound to'),
  event: z.string().describe('Event type: subscribed, modified, or deactivated'),
  url: z.string().describe('Target URL for webhook delivery'),
  blocked: z.boolean().describe('Whether the webhook is currently blocked'),
  secret: z.string().describe('Secret used for HMAC-SHA256 signature verification'),
  state: z.string().describe('Current state of the webhook'),
  created: z.string().describe('Creation timestamp'),
  modified: z.string().describe('Last modified timestamp')
});

let mapWebhook = (w: any) => ({
  webhookId: w.webhook_id,
  listId: w.list_id,
  event: w.event,
  url: w.url,
  blocked: w.blocked,
  secret: w.secret,
  state: w.state,
  created: w.created,
  modified: w.modified
});

export let getWebhooks = SlateTool.create(spec, {
  name: 'Get Webhooks',
  key: 'get_webhooks',
  description: `Retrieves webhooks configured on a Laposta mailing list. Provide a **webhookId** to get a specific webhook, or omit it to list all webhooks for the list.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to retrieve webhooks for'),
      webhookId: z.string().optional().describe('ID of a specific webhook to retrieve')
    })
  )
  .output(
    z.object({
      webhooks: z.array(webhookOutputSchema).describe('Retrieved webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.webhookId) {
      let result = await client.getWebhook(ctx.input.webhookId, ctx.input.listId);
      let webhook = mapWebhook(result.webhook);
      return {
        output: { webhooks: [webhook] },
        message: `Retrieved webhook for **${webhook.event}** event → ${webhook.url}.`
      };
    }

    let results = await client.getWebhooks(ctx.input.listId);
    let webhooks = results.map(r => mapWebhook(r.webhook));
    return {
      output: { webhooks },
      message: `Retrieved ${webhooks.length} webhook(s).`
    };
  })
  .build();

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Creates a new webhook on a Laposta mailing list. Webhooks fire when subscriber data changes (subscribe, modify, deactivate). Each webhook targets a single event type and URL.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to create the webhook on'),
      event: z
        .enum(['subscribed', 'modified', 'deactivated'])
        .describe('Event type to listen for'),
      url: z.string().describe('URL to receive webhook POST requests'),
      blocked: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to create the webhook in a blocked state')
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createWebhook({
      listId: ctx.input.listId,
      event: ctx.input.event,
      url: ctx.input.url,
      blocked: ctx.input.blocked
    });

    let webhook = mapWebhook(result.webhook);
    return {
      output: webhook,
      message: `Created webhook for **${webhook.event}** events → ${webhook.url}.`
    };
  })
  .build();

export let updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description: `Updates an existing webhook on a Laposta mailing list. Can change the event type, URL, or blocked state.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list the webhook belongs to'),
      webhookId: z.string().describe('ID of the webhook to update'),
      event: z
        .enum(['subscribed', 'modified', 'deactivated'])
        .optional()
        .describe('New event type'),
      url: z.string().optional().describe('New target URL'),
      blocked: z.boolean().optional().describe('Whether to block/unblock the webhook')
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateWebhook(ctx.input.webhookId, {
      listId: ctx.input.listId,
      event: ctx.input.event,
      url: ctx.input.url,
      blocked: ctx.input.blocked
    });

    let webhook = mapWebhook(result.webhook);
    return {
      output: webhook,
      message: `Updated webhook ${webhook.webhookId} for **${webhook.event}** events.`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Permanently deletes a webhook from a Laposta mailing list.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list the webhook belongs to'),
      webhookId: z.string().describe('ID of the webhook to delete')
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteWebhook(ctx.input.webhookId, ctx.input.listId);
    let webhook = mapWebhook(result.webhook);
    return {
      output: webhook,
      message: `Deleted webhook ${webhook.webhookId} from list ${webhook.listId}.`
    };
  })
  .build();
