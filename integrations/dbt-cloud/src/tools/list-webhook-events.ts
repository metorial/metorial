import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let listWebhookEventsTool = SlateTool.create(spec, {
  name: 'List Webhook Events',
  key: 'list_webhook_events',
  description: `List delivery events for a dbt Cloud webhook subscription. Use this to inspect recent webhook deliveries and troubleshoot downstream receipt behavior.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...accountIdInput,
      webhookId: z.string().describe('Webhook subscription ID whose events should be listed')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('Webhook subscription ID'),
      events: z.array(z.any()).describe('Webhook delivery events')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let events = await client.listWebhookEvents(ctx.input.webhookId);

    return {
      output: {
        webhookId: ctx.input.webhookId,
        events
      },
      message: `Found **${events.length}** webhook event(s).`
    };
  })
  .build();
