import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let subscriptionStatus = SlateTool.create(spec, {
  name: 'Subscription Status',
  key: 'subscription_status',
  description: `Retrieve the current Encodian subscription status including plan details, credit usage, and remaining credits. Useful for monitoring API consumption and subscription health.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      subscriptionStatus: z
        .any()
        .describe('Full subscription status including plan, credits, and usage details'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getSubscriptionStatus();

    return {
      output: {
        subscriptionStatus: result,
        operationId: result.OperationId || ''
      },
      message: `Retrieved Encodian subscription status.`
    };
  })
  .build();
