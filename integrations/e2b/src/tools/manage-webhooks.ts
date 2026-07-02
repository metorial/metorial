import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

let webhookSchema = z.object({
  webhookId: z.string().describe('Unique identifier of the webhook.'),
  teamId: z.string().describe('Team ID that owns the webhook.'),
  name: z.string().describe('Name of the webhook.'),
  createdAt: z.string().describe('ISO 8601 timestamp when the webhook was created.'),
  enabled: z.boolean().describe('Whether the webhook is currently enabled.'),
  url: z.string().describe('Target URL that receives webhook events.'),
  events: z.array(z.string()).describe('Event types the webhook is subscribed to.')
});

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List all registered webhooks for sandbox lifecycle events on the authenticated team.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      webhooks: z.array(webhookSchema).describe('List of registered webhooks.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Fetching webhooks...');
    let webhooks = await client.listWebhooks();

    return {
      output: { webhooks },
      message: `Found **${webhooks.length}** webhook(s).`
    };
  })
  .build();

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Register a new webhook to receive notifications for sandbox lifecycle events. Events include sandbox creation, updates, termination, pause, resume, and snapshots.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('A descriptive name for the webhook.'),
      url: z.string().describe('The target URL that will receive webhook POST requests.'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the webhook should be enabled immediately (default true).'),
      events: z
        .array(
          z.enum([
            'sandbox.lifecycle.created',
            'sandbox.lifecycle.updated',
            'sandbox.lifecycle.killed',
            'sandbox.lifecycle.paused',
            'sandbox.lifecycle.resumed',
            'sandbox.lifecycle.checkpointed'
          ])
        )
        .describe('Event types to subscribe to.'),
      signatureSecret: z
        .string()
        .optional()
        .describe(
          'Secret used to sign webhook payloads for verification. If not provided, one will be generated.'
        )
    })
  )
  .output(webhookSchema)
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Creating webhook...');
    let webhook = await client.createWebhook({
      name: ctx.input.name,
      url: ctx.input.url,
      enabled: ctx.input.enabled,
      events: ctx.input.events,
      signatureSecret: ctx.input.signatureSecret
    });

    return {
      output: webhook,
      message: `Created webhook **${webhook.name}** (${webhook.webhookId}) targeting \`${webhook.url}\` for ${webhook.events.length} event type(s).`
    };
  })
  .build();

export let updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description: `Update an existing webhook's configuration. You can change the target URL, enable/disable it, update subscribed event types, or change the signature secret.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('The unique identifier of the webhook to update.'),
      name: z.string().optional().describe('New name for the webhook.'),
      url: z.string().optional().describe('New target URL.'),
      enabled: z.boolean().optional().describe('Enable or disable the webhook.'),
      events: z
        .array(
          z.enum([
            'sandbox.lifecycle.created',
            'sandbox.lifecycle.updated',
            'sandbox.lifecycle.killed',
            'sandbox.lifecycle.paused',
            'sandbox.lifecycle.resumed',
            'sandbox.lifecycle.checkpointed'
          ])
        )
        .optional()
        .describe('Updated event types to subscribe to.'),
      signatureSecret: z
        .string()
        .optional()
        .describe('New signature secret for payload verification.')
    })
  )
  .output(webhookSchema)
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Updating webhook...');
    let webhook = await client.updateWebhook(ctx.input.webhookId, {
      name: ctx.input.name,
      url: ctx.input.url,
      enabled: ctx.input.enabled,
      events: ctx.input.events,
      signatureSecret: ctx.input.signatureSecret
    });

    return {
      output: webhook,
      message: `Updated webhook **${webhook.name}** (${webhook.webhookId}).`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Permanently delete a registered webhook. It will stop receiving events immediately.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('The unique identifier of the webhook to delete.')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('The ID of the deleted webhook.'),
      deleted: z.boolean().describe('Whether the webhook was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Deleting webhook...');
    await client.deleteWebhook(ctx.input.webhookId);

    return {
      output: {
        webhookId: ctx.input.webhookId,
        deleted: true
      },
      message: `Webhook **${ctx.input.webhookId}** has been deleted.`
    };
  })
  .build();
