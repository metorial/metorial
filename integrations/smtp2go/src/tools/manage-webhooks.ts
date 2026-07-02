import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailEventTypes = z.enum([
  'processed',
  'delivered',
  'open',
  'click',
  'bounce',
  'spam',
  'unsubscribe',
  'resubscribe',
  'reject'
]);

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List all webhooks configured in your SMTP2GO account, including their target URLs, event types, and scoping details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      webhooks: z.array(z.any()).describe('List of configured webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.viewWebhooks();
    let data = result.data || result;

    return {
      output: {
        webhooks: data.webhooks || data
      },
      message: `Retrieved webhooks.`
    };
  })
  .build();

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a new webhook to receive real-time notifications for email and SMS events. Configure the target URL, event types, output format, and scope to specific SMTP users or API keys.`,
  instructions: ['Free plans are limited to 1 webhook; paid plans allow up to 10.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('URL endpoint to receive webhook POST requests'),
      events: z
        .array(emailEventTypes)
        .optional()
        .describe('Email event types to trigger the webhook'),
      smsEvents: z.boolean().optional().describe('Whether to include SMS events'),
      usernames: z
        .array(z.string())
        .optional()
        .describe('SMTP users, API keys, or authenticated IPs to scope the webhook to'),
      outputType: z.enum(['json', 'form']).optional().describe('Webhook output format'),
      authorizationHeader: z
        .string()
        .optional()
        .describe('Authorization header value sent with webhook requests'),
      customHeaders: z
        .array(z.string())
        .optional()
        .describe('Custom email headers to include in webhook data')
    })
  )
  .output(
    z.object({
      webhook: z.any().describe('Created webhook details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.addWebhook(ctx.input);
    let data = result.data || result;

    return {
      output: {
        webhook: data
      },
      message: `Webhook created for **${ctx.input.url}**.`
    };
  })
  .build();

export let editWebhook = SlateTool.create(spec, {
  name: 'Edit Webhook',
  key: 'edit_webhook',
  description: `Update an existing webhook's configuration including target URL, event types, output format, and scoping.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('ID of the webhook to edit'),
      url: z.string().optional().describe('New URL endpoint'),
      events: z.array(emailEventTypes).optional().describe('Updated email event types'),
      smsEvents: z.boolean().optional().describe('Whether to include SMS events'),
      usernames: z.array(z.string()).optional().describe('Updated SMTP users/API keys scope'),
      outputType: z.enum(['json', 'form']).optional().describe('Webhook output format'),
      authorizationHeader: z.string().optional().describe('Authorization header value'),
      customHeaders: z.array(z.string()).optional().describe('Custom email headers to include')
    })
  )
  .output(
    z.object({
      webhook: z.any().describe('Updated webhook details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.editWebhook(ctx.input);
    let data = result.data || result;

    return {
      output: {
        webhook: data
      },
      message: `Webhook **${ctx.input.webhookId}** updated.`
    };
  })
  .build();

export let removeWebhook = SlateTool.create(spec, {
  name: 'Remove Webhook',
  key: 'remove_webhook',
  description: `Remove a webhook. SMTP2GO will stop sending event notifications to the webhook's URL.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('ID of the webhook to remove')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('ID of the removed webhook')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.removeWebhook(ctx.input);

    return {
      output: {
        webhookId: ctx.input.webhookId
      },
      message: `Webhook **${ctx.input.webhookId}** removed.`
    };
  })
  .build();
