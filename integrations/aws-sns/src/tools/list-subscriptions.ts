import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

let subscriptionSchema = z.object({
  subscriptionArn: z.string().describe('ARN of the subscription'),
  topicArn: z.string().describe('ARN of the subscribed topic'),
  protocol: z
    .string()
    .describe('Delivery protocol (http, https, email, sms, sqs, lambda, etc.)'),
  endpoint: z.string().describe('Endpoint receiving notifications'),
  owner: z.string().describe('AWS account ID of the subscription owner')
});

export let listSubscriptions = SlateTool.create(spec, {
  name: 'List Subscriptions',
  key: 'list_subscriptions',
  description: `List subscriptions, optionally filtered by a specific topic. Returns subscription details including protocol, endpoint, and owner. Each page returns up to 100 subscriptions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      topicArn: z
        .string()
        .optional()
        .describe(
          'Optionally filter subscriptions by topic ARN. If omitted, lists all subscriptions in the account.'
        ),
      nextToken: z.string().optional().describe('Pagination token from a previous request')
    })
  )
  .output(
    z.object({
      subscriptions: z.array(subscriptionSchema).describe('List of subscriptions'),
      nextToken: z
        .string()
        .optional()
        .describe('Token for retrieving the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result = ctx.input.topicArn
      ? await client.listSubscriptionsByTopic(ctx.input.topicArn, ctx.input.nextToken)
      : await client.listSubscriptions(ctx.input.nextToken);

    return {
      output: result,
      message: `Found **${result.subscriptions.length}** subscriptions${ctx.input.topicArn ? ` for topic \`${ctx.input.topicArn}\`` : ''}${result.nextToken ? ' (more available)' : ''}`
    };
  })
  .build();
