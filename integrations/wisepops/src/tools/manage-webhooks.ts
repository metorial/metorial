import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `Retrieve all registered webhooks (hooks) for the current website. Returns each hook's ID, event type, target URL, and optional campaign filter.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            hookId: z.number().describe('Unique identifier of the webhook.'),
            event: z.string().describe('Event type: "email", "phone", or "survey".'),
            targetUrl: z.string().describe('URL that receives the webhook payloads.'),
            wisepopId: z
              .number()
              .optional()
              .describe('Campaign ID if the webhook is scoped to a specific campaign.')
          })
        )
        .describe('List of registered webhooks.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let hooks = await client.listHooks();

    let mappedHooks = hooks.map(h => ({
      hookId: h.id,
      event: h.event,
      targetUrl: h.target_url,
      wisepopId: h.wisepop_id
    }));

    return {
      output: { webhooks: mappedHooks },
      message: `Retrieved **${mappedHooks.length}** webhook(s).`
    };
  })
  .build();

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Register a new webhook to receive real-time form submission data.
Choose an event type (email, phone, or survey) and provide a target URL. Optionally scope the webhook to a specific campaign.`,
  instructions: [
    'The target URL must be a publicly accessible HTTPS endpoint that can receive POST requests.',
    'Use "email" for sign-up block submissions, "phone" for phone block submissions, and "survey" for survey block submissions.'
  ]
})
  .input(
    z.object({
      event: z
        .enum(['email', 'phone', 'survey'])
        .describe('Event type that triggers the webhook.'),
      targetUrl: z.string().describe('URL that will receive the webhook POST payloads.'),
      wisepopId: z
        .number()
        .optional()
        .describe(
          'Campaign ID to scope the webhook to a specific campaign. Omit to receive data from all campaigns.'
        )
    })
  )
  .output(
    z.object({
      hookId: z.number().describe('Unique identifier of the newly created webhook.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.createHook({
      event: ctx.input.event,
      targetUrl: ctx.input.targetUrl,
      wisepopId: ctx.input.wisepopId
    });

    return {
      output: { hookId: result.id },
      message: `Created **${ctx.input.event}** webhook (ID: ${result.id}) targeting \`${ctx.input.targetUrl}\`.`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Remove a registered webhook by its ID. Use **List Webhooks** to find the hook ID. Once deleted, the target URL will no longer receive payloads.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      hookId: z.number().describe('ID of the webhook to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the webhook was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    await client.deleteHook(ctx.input.hookId);

    return {
      output: { success: true },
      message: `Deleted webhook **${ctx.input.hookId}**.`
    };
  })
  .build();
