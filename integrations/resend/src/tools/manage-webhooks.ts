import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let webhookEventSchema = z.enum([
  'email.sent',
  'email.delivered',
  'email.delivery_delayed',
  'email.complained',
  'email.bounced',
  'email.opened',
  'email.clicked',
  'email.received',
  'email.failed',
  'contact.created',
  'contact.updated',
  'contact.deleted',
  'domain.created',
  'domain.updated',
  'domain.deleted'
]);

let webhookOutputSchema = z.object({
  webhookId: z.string().describe('Webhook ID.'),
  endpoint: z.string().optional().describe('Webhook endpoint URL.'),
  events: z.array(z.string()).optional().describe('Subscribed event names.'),
  status: z.string().optional().describe('Webhook status.'),
  signingSecret: z
    .string()
    .optional()
    .describe('Webhook signing secret, returned when available.'),
  createdAt: z.string().optional().describe('Creation timestamp.')
});

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a Resend webhook endpoint for email, contact, or domain events.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      endpoint: z.string().describe('HTTPS endpoint URL that will receive webhook events.'),
      events: z.array(webhookEventSchema).describe('Resend event names to subscribe to.')
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let webhook = await client.createWebhook({
      endpoint: ctx.input.endpoint,
      events: ctx.input.events
    });

    return {
      output: {
        webhookId: webhook.id,
        endpoint: webhook.endpoint,
        events: webhook.events,
        status: webhook.status,
        signingSecret: webhook.signing_secret,
        createdAt: webhook.created_at
      },
      message: `Webhook \`${webhook.id}\` created for **${ctx.input.events.length}** event(s).`
    };
  })
  .build();

export let getWebhook = SlateTool.create(spec, {
  name: 'Get Webhook',
  key: 'get_webhook',
  description: `Retrieve a Resend webhook endpoint by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('Webhook ID.')
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let webhook = await client.getWebhook(ctx.input.webhookId);

    return {
      output: {
        webhookId: webhook.id,
        endpoint: webhook.endpoint,
        events: webhook.events,
        status: webhook.status,
        signingSecret: webhook.signing_secret,
        createdAt: webhook.created_at
      },
      message: `Webhook \`${webhook.id}\` retrieved.`
    };
  })
  .build();

export let updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description: `Update a Resend webhook endpoint URL, event subscriptions, or enabled status.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('Webhook ID.'),
      endpoint: z.string().optional().describe('Updated HTTPS endpoint URL.'),
      events: z.array(webhookEventSchema).optional().describe('Updated event subscriptions.'),
      status: z.enum(['enabled', 'disabled']).optional().describe('Updated webhook status.')
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let webhook = await client.updateWebhook(ctx.input.webhookId, {
      endpoint: ctx.input.endpoint,
      events: ctx.input.events,
      status: ctx.input.status
    });

    return {
      output: {
        webhookId: webhook.id,
        endpoint: webhook.endpoint,
        events: webhook.events,
        status: webhook.status,
        signingSecret: webhook.signing_secret,
        createdAt: webhook.created_at
      },
      message: `Webhook \`${webhook.id}\` updated.`
    };
  })
  .build();

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List Resend webhooks configured for the authenticated team.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      webhooks: z.array(webhookOutputSchema).describe('Configured webhooks.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listWebhooks({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });
    let webhooks = (result.data || []).map((webhook: any) => ({
      webhookId: webhook.id,
      endpoint: webhook.endpoint,
      events: webhook.events,
      status: webhook.status,
      signingSecret: webhook.signing_secret,
      createdAt: webhook.created_at
    }));

    return {
      output: {
        webhooks,
        hasMore: result.has_more ?? false
      },
      message: `Found **${webhooks.length}** webhook(s).`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Delete a Resend webhook endpoint.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('Webhook ID.')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('Deleted webhook ID.'),
      deleted: z.boolean().describe('Whether the webhook was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteWebhook(ctx.input.webhookId);

    return {
      output: {
        webhookId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Webhook \`${result.id}\` has been **deleted**.`
    };
  })
  .build();
