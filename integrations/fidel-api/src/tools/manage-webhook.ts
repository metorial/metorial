import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let webhookEventTypes = z.enum([
  'brand.consent',
  'card.failed',
  'card.linked',
  'location.status',
  'marketplace.offer.live',
  'marketplace.offer.updated',
  'program.status',
  'transaction.auth',
  'transaction.auth.qualified',
  'transaction.clearing',
  'transaction.clearing.qualified',
  'transaction.refund',
  'transaction.refund.qualified',
  'transaction.refund.match.qualified'
]);

let webhookSchema = z.object({
  webhookId: z.string().describe('Unique identifier of the webhook'),
  programId: z.string().optional().describe('ID of the program the webhook belongs to'),
  accountId: z.string().optional().describe('Account ID'),
  event: z.string().describe('Event type this webhook listens for'),
  url: z.string().describe('URL that will receive webhook notifications'),
  live: z.boolean().optional().describe('Whether the webhook is in live mode'),
  secretKey: z.string().optional().describe('Secret key for verifying webhook signatures'),
  created: z.string().optional().describe('ISO 8601 date when the webhook was created'),
  updated: z.string().optional().describe('ISO 8601 date when the webhook was last updated')
});

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Creates a new webhook subscription for a specific event type in a Program. When the event occurs, Fidel API sends an HTTP POST to the specified URL. You can have up to 5 webhooks per event type per program.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      programId: z.string().describe('ID of the program to create the webhook for'),
      event: webhookEventTypes.describe('Event type to subscribe to'),
      url: z.string().describe('URL endpoint that will receive the webhook POST requests')
    })
  )
  .output(webhookSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let webhook = await client.createWebhook(ctx.input.programId, {
      event: ctx.input.event,
      url: ctx.input.url
    });

    return {
      output: {
        webhookId: webhook.id,
        programId: webhook.programId,
        accountId: webhook.accountId,
        event: webhook.event,
        url: webhook.url,
        live: webhook.live,
        secretKey: webhook.secretKey,
        created: webhook.created,
        updated: webhook.updated
      },
      message: `Webhook created for **${webhook.event}** events → \`${ctx.input.url}\` with ID \`${webhook.id}\`.`
    };
  })
  .build();

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `Lists all webhooks configured for a specific Program. Returns each webhook's event type, URL, and configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: z.string().describe('ID of the program to list webhooks for'),
      start: z.number().optional().describe('Offset for pagination'),
      limit: z.number().optional().describe('Maximum number of webhooks to return')
    })
  )
  .output(
    z.object({
      webhooks: z.array(webhookSchema).describe('List of webhooks'),
      count: z.number().optional().describe('Total number of webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listWebhooks(ctx.input.programId, {
      start: ctx.input.start,
      limit: ctx.input.limit
    });

    let items = data?.items ?? [];
    let webhooks = items.map((w: any) => ({
      webhookId: w.id,
      programId: w.programId,
      accountId: w.accountId,
      event: w.event,
      url: w.url,
      live: w.live,
      secretKey: w.secretKey,
      created: w.created,
      updated: w.updated
    }));

    return {
      output: {
        webhooks,
        count: data?.resource?.total ?? webhooks.length
      },
      message: `Found **${webhooks.length}** webhook(s) in program \`${ctx.input.programId}\`.`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Deletes a webhook subscription from a Program. The endpoint will stop receiving notifications for the associated event.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('ID of the webhook to delete'),
      programId: z.string().describe('ID of the program the webhook belongs to')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('ID of the deleted webhook'),
      deleted: z.boolean().describe('Whether the webhook was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteWebhook(ctx.input.webhookId, ctx.input.programId);

    return {
      output: {
        webhookId: ctx.input.webhookId,
        deleted: true
      },
      message: `Webhook \`${ctx.input.webhookId}\` deleted successfully.`
    };
  })
  .build();

export let updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description: `Updates an existing webhook's URL or event type.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('ID of the webhook to update'),
      programId: z.string().describe('ID of the program the webhook belongs to'),
      event: webhookEventTypes.optional().describe('New event type'),
      url: z.string().optional().describe('New URL endpoint')
    })
  )
  .output(webhookSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let webhook = await client.updateWebhook(ctx.input.webhookId, ctx.input.programId, {
      event: ctx.input.event,
      url: ctx.input.url
    });

    return {
      output: {
        webhookId: webhook.id,
        programId: webhook.programId,
        accountId: webhook.accountId,
        event: webhook.event,
        url: webhook.url,
        live: webhook.live,
        secretKey: webhook.secretKey,
        created: webhook.created,
        updated: webhook.updated
      },
      message: `Webhook \`${webhook.id}\` updated successfully.`
    };
  })
  .build();
