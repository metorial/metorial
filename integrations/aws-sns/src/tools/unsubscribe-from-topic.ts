import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

export let unsubscribeFromTopic = SlateTool.create(spec, {
  name: 'Unsubscribe from Topic',
  key: 'unsubscribe_from_topic',
  description: `Remove a subscription from an SNS topic. Requires the subscription ARN. Only the subscription owner or topic owner can unsubscribe when authentication is required.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      subscriptionArn: z.string().describe('ARN of the subscription to remove')
    })
  )
  .output(
    z.object({
      unsubscribed: z.boolean().describe('Whether the unsubscription was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    await client.unsubscribe(ctx.input.subscriptionArn);

    return {
      output: { unsubscribed: true },
      message: `Unsubscribed \`${ctx.input.subscriptionArn}\``
    };
  })
  .build();
