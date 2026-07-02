import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { brevoServiceError } from '../lib/errors';
import { spec } from '../spec';

let webhookEventSchema = z.enum([
  'sent',
  'request',
  'delivered',
  'hardBounce',
  'softBounce',
  'blocked',
  'spam',
  'invalid',
  'deferred',
  'click',
  'opened',
  'uniqueOpened',
  'unsubscribed',
  'listAddition',
  'contactUpdated',
  'contactDeleted',
  'inboundEmailProcessed'
]);

let webhookTypeSchema = z.enum(['transactional', 'marketing', 'inbound']);
let webhookChannelSchema = z.enum(['email', 'sms']);

let webhookOutputSchema = z.object({
  webhookId: z.number().describe('Webhook ID'),
  url: z.string().optional().describe('Webhook URL'),
  type: z.string().optional().describe('Webhook type'),
  channel: z.string().optional().describe('Webhook channel'),
  description: z.string().optional().describe('Webhook description'),
  events: z.array(z.string()).optional().describe('Subscribed events'),
  batched: z.boolean().optional().describe('Whether webhooks are batched'),
  domain: z.string().optional().describe('Inbound domain')
});

let webhookInputFields = {
  url: z.string().describe('Webhook endpoint URL'),
  type: webhookTypeSchema.optional().describe('Webhook type (default: transactional)'),
  channel: webhookChannelSchema.optional().describe('Webhook channel (default: email)'),
  events: z
    .array(webhookEventSchema)
    .optional()
    .describe(
      'Events that trigger the webhook. Required for transactional and marketing webhooks; inbound defaults to inboundEmailProcessed.'
    ),
  description: z.string().optional().describe('Webhook description'),
  batched: z.boolean().optional().describe('Whether Brevo should send batched webhooks'),
  authType: z
    .enum(['basic', 'bearer'])
    .optional()
    .describe('Authentication type Brevo should use when calling the webhook URL'),
  authToken: z.string().optional().describe('Authentication token or credential value'),
  headers: z
    .array(
      z.object({
        key: z.string().describe('Header name'),
        value: z.string().describe('Header value')
      })
    )
    .optional()
    .describe('Custom headers Brevo should include with webhook requests'),
  domain: z.string().optional().describe('Inbound domain, required for inbound webhooks')
};

let mapWebhook = (webhook: any) => ({
  webhookId: webhook.id,
  url: webhook.url,
  type: webhook.type,
  channel: webhook.channel,
  description: webhook.description,
  events: webhook.events,
  batched: webhook.batched,
  domain: webhook.domain
});

let buildWebhookPayload = (
  input: {
    url?: string;
    type?: 'transactional' | 'marketing' | 'inbound';
    channel?: 'email' | 'sms';
    events?: string[];
    description?: string;
    batched?: boolean;
    authType?: 'basic' | 'bearer';
    authToken?: string;
    headers?: { key: string; value: string }[];
    domain?: string;
  },
  options: { requireCreateFields?: boolean } = {}
) => {
  let type = input.type ?? (options.requireCreateFields ? 'transactional' : undefined);
  if (type && type !== 'inbound' && !input.events?.length) {
    throw brevoServiceError('events is required for transactional and marketing webhooks.');
  }
  if (type === 'inbound' && !input.domain) {
    throw brevoServiceError('domain is required for inbound webhooks.');
  }
  if (Boolean(input.authType) !== Boolean(input.authToken)) {
    throw brevoServiceError('authType and authToken must be provided together.');
  }

  let payload: Record<string, any> = {};
  if (input.url) payload.url = input.url;
  if (input.type) payload.type = input.type;
  if (input.channel) payload.channel = input.channel;
  if (input.events) payload.events = input.events;
  if (input.description) payload.description = input.description;
  if (input.batched !== undefined) payload.batched = input.batched;
  if (input.authType && input.authToken) {
    payload.auth = {
      type: input.authType,
      token: input.authToken
    };
  }
  if (input.headers) payload.headers = input.headers;
  if (input.domain) payload.domain = input.domain;

  return payload;
};

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a Brevo webhook subscription for transactional, marketing, or inbound email events.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(z.object(webhookInputFields))
  .output(
    z.object({
      webhookId: z.number().describe('ID of the newly created webhook')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.createWebhook(
      buildWebhookPayload(ctx.input, { requireCreateFields: true }) as any
    );

    return {
      output: result,
      message: `Webhook created. Webhook ID: **${result.webhookId}**`
    };
  });

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `Retrieve Brevo webhook subscriptions, optionally filtered by webhook type.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      type: webhookTypeSchema.optional().describe('Filter by webhook type')
    })
  )
  .output(
    z.object({
      webhooks: z.array(webhookOutputSchema).describe('Webhook subscriptions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.getWebhooks(ctx.input.type);
    let webhooks = (result.webhooks ?? []).map(mapWebhook);

    return {
      output: { webhooks },
      message: `Retrieved **${webhooks.length}** webhooks.`
    };
  });

export let getWebhook = SlateTool.create(spec, {
  name: 'Get Webhook',
  key: 'get_webhook',
  description: `Retrieve details for a specific Brevo webhook subscription.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      webhookId: z.number().describe('ID of the webhook to retrieve')
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let webhook = await client.getWebhook(ctx.input.webhookId);

    return {
      output: mapWebhook(webhook),
      message: `Retrieved webhook **${ctx.input.webhookId}**.`
    };
  });

export let updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description: `Update a Brevo webhook subscription's URL, events, type, channel, description, batching, auth, headers, or inbound domain.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      webhookId: z.number().describe('ID of the webhook to update'),
      ...webhookInputFields,
      url: webhookInputFields.url.optional()
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let payload = buildWebhookPayload(ctx.input);
    if (Object.keys(payload).length === 0) {
      throw brevoServiceError('Provide at least one webhook field to update.');
    }

    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.updateWebhook(ctx.input.webhookId, payload);

    return {
      output: { success: true },
      message: `Webhook **${ctx.input.webhookId}** updated successfully.`
    };
  });

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Delete a Brevo webhook subscription.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      webhookId: z.number().describe('ID of the webhook to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.deleteWebhook(ctx.input.webhookId);

    return {
      output: { success: true },
      message: `Webhook **${ctx.input.webhookId}** deleted successfully.`
    };
  });
