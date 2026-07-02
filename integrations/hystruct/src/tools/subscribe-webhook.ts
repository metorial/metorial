import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let subscribeWebhook = SlateTool.create(spec, {
  name: 'Subscribe Webhook',
  key: 'subscribe_webhook',
  description: `Create a new webhook subscription for a specific Hystruct workflow. Webhook events will be sent as POST requests to the specified URL when the subscribed events occur (e.g., job completed, data updated).`,
  constraints: ['Rate limit: 100 requests per minute.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('The ID of the workflow to subscribe to events for.'),
      webhookUrl: z
        .string()
        .describe('The URL where webhook event payloads will be sent via POST.'),
      events: z
        .array(z.string())
        .describe('List of event types to subscribe to (e.g., job completed, data updated).')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message from the API.'),
      workflowId: z.string().describe('The workflow ID the webhook was subscribed to.'),
      webhookUrl: z.string().describe('The URL that was registered.'),
      events: z.array(z.string()).describe('The event types subscribed to.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.subscribeWebhook({
      workflowId: ctx.input.workflowId,
      webhookUrl: ctx.input.webhookUrl,
      events: ctx.input.events
    });

    return {
      output: {
        message: result.message,
        workflowId: ctx.input.workflowId,
        webhookUrl: ctx.input.webhookUrl,
        events: ctx.input.events
      },
      message: `Webhook subscription created for workflow \`${ctx.input.workflowId}\` at \`${ctx.input.webhookUrl}\`.`
    };
  })
  .build();
