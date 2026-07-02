import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

export let getTopic = SlateTool.create(spec, {
  name: 'Get Topic',
  key: 'get_topic',
  description: `Retrieve all attributes and tags for an SNS topic, including owner, display name, subscription counts, delivery policy, encryption settings, and FIFO configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      topicArn: z.string().describe('ARN of the topic to retrieve')
    })
  )
  .output(
    z.object({
      topicArn: z.string().describe('ARN of the topic'),
      owner: z.string().optional().describe('AWS account ID of the topic owner'),
      displayName: z.string().optional().describe('Display name for SMS subscriptions'),
      policy: z.string().optional().describe('JSON access control policy'),
      deliveryPolicy: z.string().optional().describe('JSON delivery retry policy'),
      effectiveDeliveryPolicy: z
        .string()
        .optional()
        .describe('Effective delivery policy with defaults applied'),
      kmsMasterKeyId: z.string().optional().describe('KMS key ID for encryption'),
      fifoTopic: z.string().optional().describe('Whether this is a FIFO topic'),
      contentBasedDeduplication: z
        .string()
        .optional()
        .describe('Whether content-based deduplication is enabled'),
      fifoThroughputScope: z.string().optional().describe('FIFO throughput scope'),
      subscriptionsConfirmed: z
        .string()
        .optional()
        .describe('Number of confirmed subscriptions'),
      subscriptionsPending: z.string().optional().describe('Number of pending subscriptions'),
      subscriptionsDeleted: z.string().optional().describe('Number of deleted subscriptions'),
      tracingConfig: z.string().optional().describe('X-Ray tracing configuration'),
      archivePolicy: z.string().optional().describe('JSON FIFO archive policy'),
      tags: z.record(z.string(), z.string()).optional().describe('Tags attached to the topic')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let attrs = await client.getTopicAttributes(ctx.input.topicArn);
    let tags = await client.listTagsForResource(ctx.input.topicArn);

    let topicName = ctx.input.topicArn.split(':').pop() || ctx.input.topicArn;

    return {
      output: {
        topicArn: attrs.TopicArn || ctx.input.topicArn,
        owner: attrs.Owner || undefined,
        displayName: attrs.DisplayName || undefined,
        policy: attrs.Policy || undefined,
        deliveryPolicy: attrs.DeliveryPolicy || undefined,
        effectiveDeliveryPolicy: attrs.EffectiveDeliveryPolicy || undefined,
        kmsMasterKeyId: attrs.KmsMasterKeyId || undefined,
        fifoTopic: attrs.FifoTopic || undefined,
        contentBasedDeduplication: attrs.ContentBasedDeduplication || undefined,
        fifoThroughputScope: attrs.FifoThroughputScope || undefined,
        subscriptionsConfirmed: attrs.SubscriptionsConfirmed || undefined,
        subscriptionsPending: attrs.SubscriptionsPending || undefined,
        subscriptionsDeleted: attrs.SubscriptionsDeleted || undefined,
        tracingConfig: attrs.TracingConfig || undefined,
        archivePolicy: attrs.ArchivePolicy || undefined,
        tags: Object.keys(tags).length > 0 ? tags : undefined
      },
      message: `Retrieved topic **${topicName}** with ${attrs.SubscriptionsConfirmed || 0} confirmed subscriptions`
    };
  })
  .build();
