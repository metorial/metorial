import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

export let updateSubscription = SlateTool.create(spec, {
  name: 'Update Subscription',
  key: 'update_subscription',
  description: `Update attributes of an existing SNS subscription. Configure filter policies, raw message delivery, delivery retry policies, or dead-letter queue settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subscriptionArn: z.string().describe('ARN of the subscription to update'),
      filterPolicy: z
        .string()
        .optional()
        .describe('JSON filter policy to receive only matching messages'),
      filterPolicyScope: z
        .enum(['MessageAttributes', 'MessageBody'])
        .optional()
        .describe('Scope of the filter policy'),
      rawMessageDelivery: z
        .boolean()
        .optional()
        .describe('Enable raw message delivery (SQS and HTTP/S only)'),
      deliveryPolicy: z
        .string()
        .optional()
        .describe('JSON delivery retry policy for HTTP/S endpoints'),
      redrivePolicy: z
        .string()
        .optional()
        .describe('JSON dead-letter queue policy for undeliverable messages')
    })
  )
  .output(
    z.object({
      subscriptionArn: z.string().describe('ARN of the updated subscription'),
      updatedAttributes: z
        .array(z.string())
        .describe('List of attribute names that were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let updatedAttributes: string[] = [];

    let updates: Array<{ name: string; value: string }> = [];
    if (ctx.input.filterPolicy !== undefined) {
      updates.push({ name: 'FilterPolicy', value: ctx.input.filterPolicy });
    }
    if (ctx.input.filterPolicyScope !== undefined) {
      updates.push({ name: 'FilterPolicyScope', value: ctx.input.filterPolicyScope });
    }
    if (ctx.input.rawMessageDelivery !== undefined) {
      updates.push({
        name: 'RawMessageDelivery',
        value: String(ctx.input.rawMessageDelivery)
      });
    }
    if (ctx.input.deliveryPolicy !== undefined) {
      updates.push({ name: 'DeliveryPolicy', value: ctx.input.deliveryPolicy });
    }
    if (ctx.input.redrivePolicy !== undefined) {
      updates.push({ name: 'RedrivePolicy', value: ctx.input.redrivePolicy });
    }

    for (let attr of updates) {
      await client.setSubscriptionAttributes(ctx.input.subscriptionArn, attr.name, attr.value);
      updatedAttributes.push(attr.name);
    }

    return {
      output: {
        subscriptionArn: ctx.input.subscriptionArn,
        updatedAttributes
      },
      message: `Updated subscription \`${ctx.input.subscriptionArn}\` — changed: ${updatedAttributes.join(', ') || 'nothing'}`
    };
  })
  .build();
