import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

export let getSubscription = SlateTool.create(spec, {
  name: 'Get Subscription',
  key: 'get_subscription',
  description: `Retrieve all attributes for an SNS subscription, including topic, owner, filter policy, delivery policy, raw delivery mode, pending confirmation state, redrive policy, and FIFO replay status when present.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      subscriptionArn: z.string().describe('ARN of the subscription to retrieve')
    })
  )
  .output(
    z.object({
      subscriptionArn: z.string().describe('ARN of the subscription'),
      topicArn: z.string().optional().describe('Topic ARN for this subscription'),
      owner: z.string().optional().describe('AWS account ID of the subscription owner'),
      confirmationWasAuthenticated: z
        .string()
        .optional()
        .describe('Whether confirmation was authenticated'),
      pendingConfirmation: z
        .string()
        .optional()
        .describe('Whether the subscription is still pending confirmation'),
      filterPolicy: z.string().optional().describe('JSON filter policy'),
      filterPolicyScope: z
        .string()
        .optional()
        .describe('Whether filtering applies to message attributes or body'),
      rawMessageDelivery: z
        .string()
        .optional()
        .describe('Whether raw message delivery is enabled'),
      deliveryPolicy: z.string().optional().describe('JSON delivery retry policy'),
      effectiveDeliveryPolicy: z
        .string()
        .optional()
        .describe('Effective delivery retry policy'),
      redrivePolicy: z.string().optional().describe('JSON dead-letter queue policy'),
      replayPolicy: z.string().optional().describe('JSON FIFO replay policy'),
      replayStatus: z.string().optional().describe('FIFO replay status'),
      subscriptionRoleArn: z
        .string()
        .optional()
        .describe('IAM role ARN for Firehose subscriptions'),
      attributes: z.record(z.string(), z.string()).describe('Raw SNS subscription attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let attrs = await client.getSubscriptionAttributes(ctx.input.subscriptionArn);

    return {
      output: {
        subscriptionArn: attrs.SubscriptionArn || ctx.input.subscriptionArn,
        topicArn: attrs.TopicArn || undefined,
        owner: attrs.Owner || undefined,
        confirmationWasAuthenticated: attrs.ConfirmationWasAuthenticated || undefined,
        pendingConfirmation: attrs.PendingConfirmation || undefined,
        filterPolicy: attrs.FilterPolicy || undefined,
        filterPolicyScope: attrs.FilterPolicyScope || undefined,
        rawMessageDelivery: attrs.RawMessageDelivery || undefined,
        deliveryPolicy: attrs.DeliveryPolicy || undefined,
        effectiveDeliveryPolicy: attrs.EffectiveDeliveryPolicy || undefined,
        redrivePolicy: attrs.RedrivePolicy || undefined,
        replayPolicy: attrs.ReplayPolicy || undefined,
        replayStatus: attrs.ReplayStatus || undefined,
        subscriptionRoleArn: attrs.SubscriptionRoleArn || undefined,
        attributes: attrs
      },
      message: `Retrieved subscription \`${ctx.input.subscriptionArn}\``
    };
  })
  .build();
