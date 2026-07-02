import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let testWebhookTool = SlateTool.create(spec, {
  name: 'Test Webhook',
  key: 'test_webhook',
  description: `Send a dbt Cloud test event to a webhook subscription endpoint and return the test delivery result.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ...accountIdInput,
      webhookId: z.string().describe('Webhook subscription ID to test')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('Webhook subscription ID that was tested'),
      result: z.any().optional().describe('Raw test delivery result from dbt Cloud')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let result = await client.testWebhook(ctx.input.webhookId);

    return {
      output: {
        webhookId: ctx.input.webhookId,
        result
      },
      message: `Sent a test event to webhook **${ctx.input.webhookId}**.`
    };
  })
  .build();
