import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `Retrieve all configured webhooks for your VerifiedEmail account. Returns each webhook with its URL, subscribed events, and enabled status.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            webhookId: z.string().describe('Unique identifier of the webhook'),
            url: z.string().describe('The webhook endpoint URL'),
            events: z.array(z.string()).describe('Event types this webhook is subscribed to'),
            enabled: z.boolean().describe('Whether the webhook is currently enabled'),
            createdAt: z.string().describe('When the webhook was created'),
            updatedAt: z.string().describe('When the webhook was last updated')
          })
        )
        .describe('Array of configured webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let webhooks = await client.getWebhooks();

    let enabledCount = webhooks.filter(w => w.enabled).length;
    return {
      output: { webhooks },
      message: `Found **${webhooks.length}** webhook(s) (**${enabledCount}** enabled).`
    };
  })
  .build();
