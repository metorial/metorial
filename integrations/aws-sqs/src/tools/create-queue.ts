import { SlateTool } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { spec } from '../spec';

export let createQueue = SlateTool.create(spec, {
  name: 'Create Queue',
  key: 'create_queue',
  description: `Create a new standard or FIFO SQS queue with optional configuration attributes and tags.
Returns the URL of the newly created queue. If a queue with the same name and identical attributes already exists, its URL is returned without creating a duplicate.`,
  instructions: [
    'FIFO queue names must end with the ".fifo" suffix.',
    'Set "fifoQueue" to true in attributes for FIFO queue creation.',
    'You must wait 60 seconds after deleting a queue before creating one with the same name.'
  ],
  constraints: [
    'Queue names are limited to 80 characters (alphanumeric, hyphens, underscores).',
    'Maximum 50 tags per queue.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      queueName: z
        .string()
        .describe(
          'Name of the queue to create (max 80 chars). FIFO queue names must end with ".fifo".'
        ),
      attributes: z
        .object({
          delaySeconds: z
            .string()
            .optional()
            .describe('Delivery delay in seconds (0-900). Default: 0'),
          maximumMessageSize: z
            .string()
            .optional()
            .describe('Max message size in bytes (1024-1048576). Default: 262144'),
          messageRetentionPeriod: z
            .string()
            .optional()
            .describe('Message retention in seconds (60-1209600). Default: 345600 (4 days)'),
          visibilityTimeout: z
            .string()
            .optional()
            .describe('Visibility timeout in seconds (0-43200). Default: 30'),
          receiveMessageWaitTimeSeconds: z
            .string()
            .optional()
            .describe('Long poll wait time in seconds (0-20). Default: 0'),
          fifoQueue: z.string().optional().describe('Set to "true" for FIFO queue'),
          contentBasedDeduplication: z
            .string()
            .optional()
            .describe('Set to "true" to enable content-based deduplication (FIFO only)'),
          kmsMasterKeyId: z
            .string()
            .optional()
            .describe('AWS KMS key ID for server-side encryption'),
          kmsDataKeyReusePeriodSeconds: z
            .string()
            .optional()
            .describe('KMS data key reuse period in seconds (60-86400). Default: 300'),
          sqsManagedSseEnabled: z
            .string()
            .optional()
            .describe('Set to "true" for SQS-managed SSE encryption'),
          redrivePolicy: z
            .string()
            .optional()
            .describe(
              'JSON string with deadLetterTargetArn and maxReceiveCount for dead-letter queue config'
            ),
          redriveAllowPolicy: z
            .string()
            .optional()
            .describe('JSON string with redrivePermission and optional sourceQueueArns'),
          policy: z.string().optional().describe('Queue access policy as JSON string')
        })
        .optional()
        .describe('Queue configuration attributes'),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Cost allocation tags as key-value pairs')
    })
  )
  .output(
    z.object({
      queueUrl: z.string().describe('URL of the created SQS queue')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SqsClient({
      region: ctx.config.region,
      credentials: {
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken
      }
    });

    let attributes: Record<string, string> = {};
    if (ctx.input.attributes) {
      let attrMap: Record<string, string | undefined> = {
        DelaySeconds: ctx.input.attributes.delaySeconds,
        MaximumMessageSize: ctx.input.attributes.maximumMessageSize,
        MessageRetentionPeriod: ctx.input.attributes.messageRetentionPeriod,
        VisibilityTimeout: ctx.input.attributes.visibilityTimeout,
        ReceiveMessageWaitTimeSeconds: ctx.input.attributes.receiveMessageWaitTimeSeconds,
        FifoQueue: ctx.input.attributes.fifoQueue,
        ContentBasedDeduplication: ctx.input.attributes.contentBasedDeduplication,
        KmsMasterKeyId: ctx.input.attributes.kmsMasterKeyId,
        KmsDataKeyReusePeriodSeconds: ctx.input.attributes.kmsDataKeyReusePeriodSeconds,
        SqsManagedSseEnabled: ctx.input.attributes.sqsManagedSseEnabled,
        RedrivePolicy: ctx.input.attributes.redrivePolicy,
        RedriveAllowPolicy: ctx.input.attributes.redriveAllowPolicy,
        Policy: ctx.input.attributes.policy
      };

      for (let [key, val] of Object.entries(attrMap)) {
        if (val !== undefined) {
          attributes[key] = val;
        }
      }
    }

    let result = await client.createQueue({
      queueName: ctx.input.queueName,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      tags: ctx.input.tags
    });

    return {
      output: result,
      message: `Created queue **${ctx.input.queueName}** at \`${result.queueUrl}\``
    };
  })
  .build();
