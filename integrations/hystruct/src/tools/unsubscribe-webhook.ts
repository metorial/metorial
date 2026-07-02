import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let unsubscribeWebhook = SlateTool.create(spec, {
  name: 'Unsubscribe Webhook',
  key: 'unsubscribe_webhook',
  description: `Delete an existing webhook subscription by its ID. The webhook will no longer receive event notifications. Use the **List Webhooks** tool to find webhook IDs.`,
  constraints: ['Rate limit: 100 requests per minute.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('The ID of the webhook subscription to delete.')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message from the API.'),
      webhookId: z.string().describe('The ID of the deleted webhook subscription.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.unsubscribeWebhook(ctx.input.webhookId);

    return {
      output: {
        message: result.message,
        webhookId: ctx.input.webhookId
      },
      message: `Webhook subscription \`${ctx.input.webhookId}\` has been deleted.`
    };
  })
  .build();
