import { SlateTool } from 'slates';
import { z } from 'zod';
import { PayhereClient } from '../lib/client';
import { spec } from '../spec';

export let cancelSubscription = SlateTool.create(spec, {
  name: 'Cancel Subscription',
  key: 'cancel_subscription',
  description: `Cancel an active subscription. This stops future billing for the customer on the associated plan.`,
  constraints: [
    'This action cannot be undone. The customer will need to re-subscribe if they want to resume.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      subscriptionId: z.number().describe('ID of the subscription to cancel')
    })
  )
  .output(
    z.object({
      subscriptionId: z.number().describe('ID of the cancelled subscription'),
      cancelled: z.boolean().describe('Whether the cancellation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayhereClient({ token: ctx.auth.token });

    await client.cancelSubscription(ctx.input.subscriptionId);

    return {
      output: {
        subscriptionId: ctx.input.subscriptionId,
        cancelled: true
      },
      message: `Subscription **#${ctx.input.subscriptionId}** has been cancelled.`
    };
  })
  .build();
