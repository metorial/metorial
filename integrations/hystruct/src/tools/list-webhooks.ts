import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List all active webhook subscriptions for your Hystruct team. Returns each webhook's ID, URL, subscribed events, and creation date.`,
  constraints: ['Rate limit: 100 requests per minute.'],
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
            webhookId: z.string().describe('Unique identifier of the webhook subscription.'),
            createdAt: z.string().describe('Timestamp when the webhook was created.'),
            url: z.string().describe('The URL where webhook events are sent.'),
            events: z
              .array(z.string())
              .describe('List of event types this webhook is subscribed to.')
          })
        )
        .describe('All active webhook subscriptions.'),
      count: z.number().describe('Total number of webhook subscriptions.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listWebhooks();

    return {
      output: {
        webhooks: result.webhooks,
        count: result.webhooks.length
      },
      message: `Found **${result.webhooks.length}** webhook subscription(s).`
    };
  })
  .build();
