import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { webhookId } from '../lib/schemas';
import { spec } from '../spec';

let webhookOutputSchema = z.object({
  webhookId: webhookId,
  type: z.string().optional().describe('Webhook scope: "account" or "group"'),
  url: z.string().describe('URL that receives webhook payloads'),
  events: z.array(z.string()).describe('Event types this webhook listens to'),
  active: z.boolean().describe('Whether the webhook is active'),
  groupId: z
    .string()
    .optional()
    .nullable()
    .describe('Group ID if this is a group-level webhook'),
  createdAt: z.string().optional().describe('Timestamp when the webhook was created'),
  createdBy: z.string().optional().describe('User ID who created the webhook')
});

let mapWebhook = (w: any) => ({
  webhookId: w.id,
  type: w.type,
  url: w.url,
  events: w.events,
  active: w.active,
  groupId: w.group_id,
  createdAt: w.created_at,
  createdBy: w.created_by
});

export const getWebhook = SlateTool.create(spec, {
  key: 'get_webhook',
  name: 'Get Webhook',
  description:
    'Read an existing webhook subscription, its event types and active status. Signing secrets are omitted.',
  tags: { readOnly: true }
})
  .input(z.object({ webhookId }))
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    const webhook = await new FivetranClient(ctx.auth.token).getWebhook(ctx.input.webhookId);
    return { output: mapWebhook(webhook), message: `Retrieved webhook ${webhook.id}.` };
  })
  .build();

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List all webhooks configured in the Fivetran account. Webhooks notify external URLs when events like syncs, transformations, or status changes occur.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      webhooks: z.array(webhookOutputSchema).describe('List of webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let items = await client.listWebhooks();

    let webhooks = items.map(mapWebhook);

    return {
      output: { webhooks },
      message: `Found **${webhooks.length}** webhook(s).`
    };
  })
  .build();

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a new webhook to receive notifications for Fivetran events. Webhooks can be account-level (all activity) or group-level (activity within a specific group).`,
  instructions: [
    'The URL must use HTTPS.',
    'Use event names supported by the current provider configuration, such as sync_start or sync_end.',
    'If a secret is provided, payloads will be signed with SHA-256 HMAC.'
  ]
})
  .input(
    z.object({
      url: z.string().describe('HTTPS URL to receive webhook payloads'),
      events: z.array(z.string()).describe('Event types to subscribe to'),
      active: z.boolean().optional().default(true).describe('Whether the webhook is active'),
      secret: z.string().optional().describe('Secret for signing payloads with SHA-256 HMAC'),
      groupId: z
        .string()
        .optional()
        .describe(
          'Group ID for group-level webhook. If omitted, creates an account-level webhook.'
        )
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    let body: Record<string, any> = {
      url: ctx.input.url,
      events: ctx.input.events,
      active: ctx.input.active
    };
    if (ctx.input.secret !== undefined) body.secret = ctx.input.secret;

    let w: any;
    if (ctx.input.groupId) {
      w = await client.createGroupWebhook(ctx.input.groupId, body);
    } else {
      w = await client.createAccountWebhook(body);
    }

    return {
      output: mapWebhook(w),
      message: `Created ${ctx.input.groupId ? 'group' : 'account'}-level webhook **${w.id}** for events: ${ctx.input.events.join(', ')}.`
    };
  })
  .build();

export let updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description: `Update an existing webhook's URL, events, active status, or secret.`
})
  .input(
    z.object({
      webhookId: webhookId,
      url: z.string().optional().describe('Updated HTTPS URL'),
      events: z.array(z.string()).optional().describe('Updated event types'),
      active: z.boolean().optional().describe('Enable or disable the webhook'),
      secret: z.string().optional().describe('Updated secret for payload signing')
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    let body: Record<string, any> = {};
    if (ctx.input.url !== undefined) body.url = ctx.input.url;
    if (ctx.input.events !== undefined) body.events = ctx.input.events;
    if (ctx.input.active !== undefined) body.active = ctx.input.active;
    if (ctx.input.secret !== undefined) body.secret = ctx.input.secret;

    let w = await client.updateWebhook(ctx.input.webhookId, body);

    return {
      output: mapWebhook(w),
      message: `Updated webhook **${w.id}**.`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Delete a webhook. The webhook will stop receiving event notifications immediately.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      webhookId: webhookId
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    await client.deleteWebhook(ctx.input.webhookId);

    return {
      output: { success: true },
      message: `Deleted webhook ${ctx.input.webhookId}.`
    };
  })
  .build();
