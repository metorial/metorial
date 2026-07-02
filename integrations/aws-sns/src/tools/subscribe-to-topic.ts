import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { snsServiceError } from '../lib/errors';
import { spec } from '../spec';

export let subscribeToTopic = SlateTool.create(spec, {
  name: 'Subscribe to Topic',
  key: 'subscribe_to_topic',
  description: `Subscribe an endpoint to an SNS topic. Supports SQS, HTTP/HTTPS, email, SMS, Lambda, Firehose, and mobile push protocols. Optionally configure filter policies, raw message delivery, and dead-letter queues.`,
  instructions: [
    'HTTP/S, email, and cross-account subscriptions require confirmation by the endpoint owner.',
    'FIFO topics only support SQS queue subscriptions.',
    'For Firehose subscriptions, subscriptionRoleArn is required.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      topicArn: z.string().describe('ARN of the topic to subscribe to'),
      protocol: z
        .enum([
          'http',
          'https',
          'email',
          'email-json',
          'sms',
          'sqs',
          'application',
          'lambda',
          'firehose'
        ])
        .describe('Delivery protocol for the subscription'),
      endpoint: z
        .string()
        .optional()
        .describe('Endpoint to receive notifications (URL, email, phone, ARN, etc.)'),
      filterPolicy: z
        .string()
        .optional()
        .describe('JSON filter policy to receive only matching messages'),
      filterPolicyScope: z
        .enum(['MessageAttributes', 'MessageBody'])
        .optional()
        .describe('Scope of the filter policy (default: MessageAttributes)'),
      rawMessageDelivery: z
        .boolean()
        .optional()
        .describe('Enable raw message delivery (SQS and HTTP/S only)'),
      redrivePolicy: z
        .string()
        .optional()
        .describe('JSON dead-letter queue policy for undeliverable messages'),
      replayPolicy: z
        .string()
        .optional()
        .describe('JSON FIFO replay policy for replaying archived messages'),
      subscriptionRoleArn: z
        .string()
        .optional()
        .describe('IAM role ARN (required for Firehose subscriptions)')
    })
  )
  .output(
    z.object({
      subscriptionArn: z
        .string()
        .describe(
          'ARN of the subscription, or "pending confirmation" if confirmation is required'
        )
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.protocol === 'firehose' && !ctx.input.subscriptionRoleArn) {
      throw snsServiceError('subscriptionRoleArn is required for Firehose subscriptions.');
    }

    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let attributes: Record<string, string> = {};
    if (ctx.input.filterPolicy) attributes.FilterPolicy = ctx.input.filterPolicy;
    if (ctx.input.filterPolicyScope)
      attributes.FilterPolicyScope = ctx.input.filterPolicyScope;
    if (ctx.input.rawMessageDelivery !== undefined)
      attributes.RawMessageDelivery = String(ctx.input.rawMessageDelivery);
    if (ctx.input.redrivePolicy) attributes.RedrivePolicy = ctx.input.redrivePolicy;
    if (ctx.input.replayPolicy) attributes.ReplayPolicy = ctx.input.replayPolicy;
    if (ctx.input.subscriptionRoleArn)
      attributes.SubscriptionRoleArn = ctx.input.subscriptionRoleArn;

    let result = await client.subscribe({
      topicArn: ctx.input.topicArn,
      protocol: ctx.input.protocol,
      endpoint: ctx.input.endpoint,
      returnSubscriptionArn: true,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined
    });

    let isPending =
      result.subscriptionArn === 'pending confirmation' ||
      result.subscriptionArn === 'PendingConfirmation';

    return {
      output: result,
      message: isPending
        ? `Subscription to \`${ctx.input.topicArn}\` via **${ctx.input.protocol}** is pending confirmation`
        : `Subscribed to \`${ctx.input.topicArn}\` via **${ctx.input.protocol}** — ARN: \`${result.subscriptionArn}\``
    };
  })
  .build();
