import { SlateTool } from 'slates';
import { z } from 'zod';
import { SqsClient } from '../lib/client';
import { spec } from '../spec';

export let manageQueue = SlateTool.create(spec, {
  name: 'Manage Queue',
  key: 'manage_queue',
  description: `Get or update SQS queue attributes, and manage queue tags. Use this to inspect queue configuration, modify settings like visibility timeout, configure dead-letter queues, enable encryption, or manage cost allocation tags.`,
  instructions: [
    'To get queue attributes, provide "queueUrl" and optionally "attributeNames".',
    'To update attributes, provide "queueUrl" and "setAttributes".',
    'To manage tags, provide "addTags" to add/update or "removeTagKeys" to remove tags.',
    'Changes typically propagate within 60 seconds.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      queueUrl: z.string().describe('Full URL of the SQS queue'),
      attributeNames: z
        .array(z.string())
        .optional()
        .describe(
          'Attribute names to retrieve (e.g., ["All"], ["VisibilityTimeout", "QueueArn"]). Defaults to ["All"] when getting attributes.'
        ),
      setAttributes: z
        .object({
          delaySeconds: z.string().optional().describe('Delivery delay in seconds (0-900)'),
          maximumMessageSize: z
            .string()
            .optional()
            .describe('Max message size in bytes (1024-1048576)'),
          messageRetentionPeriod: z
            .string()
            .optional()
            .describe('Message retention in seconds (60-1209600)'),
          visibilityTimeout: z
            .string()
            .optional()
            .describe('Visibility timeout in seconds (0-43200)'),
          receiveMessageWaitTimeSeconds: z
            .string()
            .optional()
            .describe('Long poll wait time in seconds (0-20)'),
          policy: z.string().optional().describe('Queue access policy as JSON string'),
          redrivePolicy: z
            .string()
            .optional()
            .describe(
              'Dead-letter queue config as JSON (deadLetterTargetArn, maxReceiveCount)'
            ),
          redriveAllowPolicy: z
            .string()
            .optional()
            .describe('DLQ redrive permissions as JSON'),
          kmsMasterKeyId: z.string().optional().describe('KMS key ID for encryption'),
          kmsDataKeyReusePeriodSeconds: z
            .string()
            .optional()
            .describe('KMS data key reuse period (60-86400)'),
          sqsManagedSseEnabled: z
            .string()
            .optional()
            .describe('Enable/disable SQS-managed SSE ("true"/"false")'),
          contentBasedDeduplication: z
            .string()
            .optional()
            .describe('Enable/disable content-based deduplication for FIFO ("true"/"false")')
        })
        .optional()
        .describe('Attributes to update on the queue'),
      addTags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Tags to add or update on the queue'),
      removeTagKeys: z
        .array(z.string())
        .optional()
        .describe('Tag keys to remove from the queue')
    })
  )
  .output(
    z.object({
      attributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Current queue attributes'),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Current queue tags (returned when tags are modified)'),
      updated: z.boolean().describe('Whether any attributes or tags were updated')
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

    let updated = false;
    let messages: string[] = [];

    // Update attributes if provided
    if (ctx.input.setAttributes) {
      let attrs: Record<string, string> = {};
      let attrMap: Record<string, string | undefined> = {
        DelaySeconds: ctx.input.setAttributes.delaySeconds,
        MaximumMessageSize: ctx.input.setAttributes.maximumMessageSize,
        MessageRetentionPeriod: ctx.input.setAttributes.messageRetentionPeriod,
        VisibilityTimeout: ctx.input.setAttributes.visibilityTimeout,
        ReceiveMessageWaitTimeSeconds: ctx.input.setAttributes.receiveMessageWaitTimeSeconds,
        Policy: ctx.input.setAttributes.policy,
        RedrivePolicy: ctx.input.setAttributes.redrivePolicy,
        RedriveAllowPolicy: ctx.input.setAttributes.redriveAllowPolicy,
        KmsMasterKeyId: ctx.input.setAttributes.kmsMasterKeyId,
        KmsDataKeyReusePeriodSeconds: ctx.input.setAttributes.kmsDataKeyReusePeriodSeconds,
        SqsManagedSseEnabled: ctx.input.setAttributes.sqsManagedSseEnabled,
        ContentBasedDeduplication: ctx.input.setAttributes.contentBasedDeduplication
      };

      for (let [key, val] of Object.entries(attrMap)) {
        if (val !== undefined) {
          attrs[key] = val;
        }
      }

      if (Object.keys(attrs).length > 0) {
        await client.setQueueAttributes(ctx.input.queueUrl, attrs);
        updated = true;
        messages.push(`Updated **${Object.keys(attrs).length}** attribute(s)`);
      }
    }

    // Add tags
    if (ctx.input.addTags && Object.keys(ctx.input.addTags).length > 0) {
      await client.tagQueue(ctx.input.queueUrl, ctx.input.addTags);
      updated = true;
      messages.push(`Added **${Object.keys(ctx.input.addTags).length}** tag(s)`);
    }

    // Remove tags
    if (ctx.input.removeTagKeys && ctx.input.removeTagKeys.length > 0) {
      await client.untagQueue(ctx.input.queueUrl, ctx.input.removeTagKeys);
      updated = true;
      messages.push(`Removed **${ctx.input.removeTagKeys.length}** tag(s)`);
    }

    // Get attributes
    let attributes = await client.getQueueAttributes(
      ctx.input.queueUrl,
      ctx.input.attributeNames
    );

    // Get tags if we modified them
    let tags: Record<string, string> | undefined;
    if (ctx.input.addTags || ctx.input.removeTagKeys) {
      tags = await client.listQueueTags(ctx.input.queueUrl);
    }

    if (!updated) {
      messages.push('Retrieved queue attributes');
    }

    return {
      output: {
        attributes,
        tags,
        updated
      },
      message: messages.join('. ')
    };
  })
  .build();
