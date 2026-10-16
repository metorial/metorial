import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { programIdInput } from '../lib/schemas';
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
  'transaction.refund.match.qualified',
  'credits.balance.low',
  'mid-request.succeeded',
  'mid-request.failed',
  'missing-transaction-request.succeeded',
  'missing-transaction-request.failed',
  'offer-location.linked',
  'offer-location.unlinked'
]);

export let webhookSchema = z.object({
  raw: z.record(z.string(), z.any()).optional().describe('Complete provider resource'),
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
  description: `Creates a new webhook subscription for a specific event type in a Program. When the event occurs, Fidel API sends an HTTP POST to the specified URL. Use an HTTPS destination. Brand consent and offer-location events are account-scoped; program events use the supplied Program.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      programId: programIdInput,
      event: webhookEventTypes.describe('Event type to subscribe to'),
      offerId: z.string().optional().describe('Filter qualified transaction events by offer'),
      headers: z.record(z.string(), z.string()).optional().describe('Custom HTTP headers'),
      url: z.string().describe('HTTPS endpoint that will receive the webhook POST requests')
    })
  )
  .output(webhookSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let webhook = await client.createWebhook(ctx.input.programId, {
      event: ctx.input.event,
      url: ctx.input.url,
      offerId: ctx.input.offerId,
      headers: ctx.input.headers
    });

    return {
      output: {
        raw: webhook,
        webhookId: webhook.id,
        programId: webhook.programId ?? undefined,
        accountId: webhook.accountId ?? undefined,
        event: webhook.event,
        url: webhook.url,
        live: webhook.live,
        secretKey: webhook.secretKey ?? undefined,
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
      programId: programIdInput,
      start: z.number().optional().describe('Offset for pagination'),
      event: z.string().optional().describe('Filter by webhook event'),
      limit: z.number().optional().describe('Maximum number of webhooks to return')
    })
  )
  .output(
    z.object({
      webhooks: z.array(webhookSchema).describe('List of webhooks'),
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete provider response before applying a local offset'),
      count: z.number().optional().describe('Number of webhooks reported by Fidel')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listWebhooks(ctx.input.programId, {
      start: ctx.input.start,
      limit: ctx.input.limit,
      event: ctx.input.event
    });

    let items = data?.items ?? [];
    let webhooks = items.map((w: any) => ({
      raw: w,
      webhookId: w.id,
      programId: w.programId ?? undefined,
      accountId: w.accountId ?? undefined,
      event: w.event,
      url: w.url,
      live: w.live,
      secretKey: w.secretKey ?? undefined,
      created: w.created,
      updated: w.updated
    }));

    return {
      output: {
        webhooks,
        count: data?.count,
        raw: data.rawResponse ?? data
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
      programId: programIdInput
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
      programId: programIdInput,
      event: webhookEventTypes.optional().describe('New event type'),
      offerId: z.string().optional().describe('Filter qualified transaction events by offer'),
      headers: z.record(z.string(), z.string()).optional().describe('Custom HTTP headers'),
      url: z.string().optional().describe('New HTTPS URL endpoint')
    })
  )
  .output(webhookSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let webhook = await client.updateWebhook(ctx.input.webhookId, ctx.input.programId, {
      event: ctx.input.event,
      url: ctx.input.url,
      offerId: ctx.input.offerId,
      headers: ctx.input.headers
    });

    return {
      output: {
        raw: webhook,
        webhookId: webhook.id,
        programId: webhook.programId ?? undefined,
        accountId: webhook.accountId ?? undefined,
        event: webhook.event,
        url: webhook.url,
        live: webhook.live,
        secretKey: webhook.secretKey ?? undefined,
        created: webhook.created,
        updated: webhook.updated
      },
      message: `Webhook \`${webhook.id}\` updated successfully.`
    };
  })
  .build();
