import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

export let createTopic = SlateTool.create(spec, {
  name: 'Create Topic',
  key: 'create_topic',
  description: `Create a new SNS topic (standard or FIFO) for publishing messages to subscribers. Optionally configure display name, encryption, delivery policies, and tags. FIFO topic names must end with \`.fifo\`.`,
  constraints: [
    'Up to 100,000 standard topics and 1,000 FIFO topics per account.',
    'Topic names: 1-256 characters, alphanumeric, hyphens, underscores only.',
    'FIFO topic names must end with .fifo suffix.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the topic. FIFO topics must end with .fifo'),
      displayName: z.string().optional().describe('Display name used for SMS subscriptions'),
      deliveryPolicy: z
        .string()
        .optional()
        .describe('JSON delivery retry policy for HTTP/S endpoints'),
      policy: z.string().optional().describe('JSON access control policy for the topic'),
      kmsMasterKeyId: z.string().optional().describe('KMS key ID for server-side encryption'),
      fifoTopic: z.boolean().optional().describe('Set to true to create a FIFO topic'),
      contentBasedDeduplication: z
        .boolean()
        .optional()
        .describe('Enable content-based deduplication for FIFO topics'),
      fifoThroughputScope: z
        .enum(['Topic', 'MessageGroup'])
        .optional()
        .describe('FIFO throughput and deduplication scope'),
      tracingConfig: z
        .enum(['PassThrough', 'Active'])
        .optional()
        .describe('X-Ray tracing mode'),
      archivePolicy: z
        .string()
        .optional()
        .describe('JSON message retention policy for FIFO topics'),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value tags to attach to the topic')
    })
  )
  .output(
    z.object({
      topicArn: z.string().describe('ARN of the created topic')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result = await client.createTopic(
      ctx.input.name,
      {
        displayName: ctx.input.displayName,
        deliveryPolicy: ctx.input.deliveryPolicy,
        policy: ctx.input.policy,
        kmsMasterKeyId: ctx.input.kmsMasterKeyId,
        fifoTopic: ctx.input.fifoTopic,
        contentBasedDeduplication: ctx.input.contentBasedDeduplication,
        fifoThroughputScope: ctx.input.fifoThroughputScope,
        tracingConfig: ctx.input.tracingConfig,
        archivePolicy: ctx.input.archivePolicy
      },
      ctx.input.tags as Record<string, string> | undefined
    );

    return {
      output: result,
      message: `Created topic **${ctx.input.name}** with ARN \`${result.topicArn}\``
    };
  })
  .build();
