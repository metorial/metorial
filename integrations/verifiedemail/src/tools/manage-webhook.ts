import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Create, update, or disable webhooks for receiving VerifiedEmail event notifications. Webhooks notify your endpoint when verification operations complete, such as bulk list verification jobs finishing.

To **create** a webhook, provide a URL and events to subscribe to. To **update** an existing webhook, provide the webhook ID along with the fields to change. To **disable**, set the enabled field to false.`,
  instructions: [
    'To create a new webhook, provide url and events. Leave webhookId empty.',
    'To update an existing webhook, provide the webhookId along with the fields to change.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      webhookId: z
        .string()
        .optional()
        .describe('ID of an existing webhook to update. Leave empty to create a new webhook.'),
      url: z.string().optional().describe('The URL that will receive webhook event payloads'),
      events: z
        .array(z.string())
        .optional()
        .describe(
          'Array of event types to subscribe to (e.g. list.completed, verification.completed)'
        ),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the webhook is enabled. Set to false to disable.')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('Unique identifier of the webhook'),
      url: z.string().describe('The webhook endpoint URL'),
      events: z.array(z.string()).describe('Event types this webhook is subscribed to'),
      enabled: z.boolean().describe('Whether the webhook is currently enabled'),
      createdAt: z.string().describe('When the webhook was created'),
      updatedAt: z.string().describe('When the webhook was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.webhookId) {
      ctx.progress(`Updating webhook ${ctx.input.webhookId}`);
      let webhook = await client.updateWebhook(ctx.input.webhookId, {
        url: ctx.input.url,
        events: ctx.input.events,
        enabled: ctx.input.enabled
      });

      return {
        output: webhook,
        message: `Updated webhook \`${webhook.webhookId}\`. URL: ${webhook.url}. Enabled: **${webhook.enabled}**. Events: ${webhook.events.join(', ')}.`
      };
    } else {
      if (!ctx.input.url || !ctx.input.events) {
        throw new Error('Both url and events are required when creating a new webhook.');
      }

      ctx.progress('Creating new webhook');
      let webhook = await client.createWebhook(ctx.input.url, ctx.input.events);

      return {
        output: webhook,
        message: `Created webhook \`${webhook.webhookId}\` for URL ${webhook.url}. Events: ${webhook.events.join(', ')}.`
      };
    }
  })
  .build();
