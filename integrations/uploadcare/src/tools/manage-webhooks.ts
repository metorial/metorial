import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let webhookSchema = z.object({
  webhookId: z.number().describe('Webhook ID'),
  targetUrl: z.string().describe('URL that receives webhook notifications'),
  event: z.string().describe('Event type this webhook listens for'),
  isActive: z.boolean().describe('Whether the webhook is active'),
  signingSecret: z
    .string()
    .nullable()
    .describe('Signing secret for verifying webhook payloads')
});

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List all webhooks configured for the current Uploadcare project.`,
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
    let client = new Client(ctx.auth);
    let webhooks = await client.listWebhooks();

    return {
      output: {
        webhooks: webhooks.map(w => ({
          webhookId: w.id,
          targetUrl: w.target_url,
          event: w.event,
          isActive: w.is_active,
          signingSecret: w.signing_secret
        }))
      },
      message: `Found **${webhooks.length}** webhook(s).`
    };
  })
  .build();

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Register a new webhook to receive notifications for file events. Supported events: file.uploaded, file.stored, file.deleted, file.infected, file.info_updated.`
})
  .input(
    z.object({
      targetUrl: z.string().describe('URL that will receive webhook POST requests'),
      event: z
        .enum([
          'file.uploaded',
          'file.stored',
          'file.deleted',
          'file.infected',
          'file.info_updated'
        ])
        .describe('Event type to subscribe to'),
      isActive: z
        .boolean()
        .optional()
        .describe('Whether the webhook is active (default: true)'),
      signingSecret: z
        .string()
        .optional()
        .describe('Secret key for HMAC-SHA256 signature verification of payloads')
    })
  )
  .output(webhookSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let webhook = await client.createWebhook({
      targetUrl: ctx.input.targetUrl,
      event: ctx.input.event,
      isActive: ctx.input.isActive,
      signingSecret: ctx.input.signingSecret
    });

    return {
      output: {
        webhookId: webhook.id,
        targetUrl: webhook.target_url,
        event: webhook.event,
        isActive: webhook.is_active,
        signingSecret: webhook.signing_secret
      },
      message: `Created webhook **#${webhook.id}** for **${webhook.event}** events → ${webhook.target_url}.`
    };
  })
  .build();

export let updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description: `Update an existing webhook's target URL, event type, active status, or signing secret.`
})
  .input(
    z.object({
      webhookId: z.number().describe('ID of the webhook to update'),
      targetUrl: z.string().optional().describe('New target URL'),
      event: z
        .enum([
          'file.uploaded',
          'file.stored',
          'file.deleted',
          'file.infected',
          'file.info_updated'
        ])
        .optional()
        .describe('New event type'),
      isActive: z.boolean().optional().describe('Whether the webhook should be active'),
      signingSecret: z.string().optional().describe('New signing secret')
    })
  )
  .output(webhookSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let webhook = await client.updateWebhook(ctx.input.webhookId, {
      targetUrl: ctx.input.targetUrl,
      event: ctx.input.event,
      isActive: ctx.input.isActive,
      signingSecret: ctx.input.signingSecret
    });

    return {
      output: {
        webhookId: webhook.id,
        targetUrl: webhook.target_url,
        event: webhook.event,
        isActive: webhook.is_active,
        signingSecret: webhook.signing_secret
      },
      message: `Updated webhook **#${webhook.id}**.`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Delete a webhook by its target URL. The webhook will stop receiving event notifications.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      targetUrl: z.string().describe('Target URL of the webhook to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the webhook was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.deleteWebhook(ctx.input.targetUrl);

    return {
      output: { deleted: true },
      message: `Deleted webhook for target URL: ${ctx.input.targetUrl}.`
    };
  })
  .build();
