import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

export let confirmSubscription = SlateTool.create(spec, {
  name: 'Confirm Subscription',
  key: 'confirm_subscription',
  description: `Confirm a pending SNS subscription using the confirmation token. HTTP/S, email, and cross-account subscriptions require explicit confirmation before notifications are delivered. Tokens are valid for 2 days.`,
  constraints: ['Confirmation tokens expire after 2 days.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      topicArn: z.string().describe('ARN of the topic'),
      confirmationToken: z.string().describe('The confirmation token sent to the endpoint'),
      authenticateOnUnsubscribe: z
        .boolean()
        .optional()
        .describe('Require authentication for future unsubscribe requests')
    })
  )
  .output(
    z.object({
      subscriptionArn: z.string().describe('ARN of the confirmed subscription')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result = await client.confirmSubscription(
      ctx.input.topicArn,
      ctx.input.confirmationToken,
      ctx.input.authenticateOnUnsubscribe
    );

    return {
      output: result,
      message: `Confirmed subscription to \`${ctx.input.topicArn}\` — ARN: \`${result.subscriptionArn}\``
    };
  })
  .build();
