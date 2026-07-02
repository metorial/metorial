import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

export let updateTopic = SlateTool.create(spec, {
  name: 'Update Topic',
  key: 'update_topic',
  description: `Update attributes and/or tags of an SNS topic. Set any combination of display name, delivery policy, access policy, encryption, tracing, and FIFO-specific settings. Tags can be added or removed independently.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      topicArn: z.string().describe('ARN of the topic to update'),
      displayName: z.string().optional().describe('New display name for SMS subscriptions'),
      deliveryPolicy: z
        .string()
        .optional()
        .describe('JSON delivery retry policy for HTTP/S endpoints'),
      policy: z.string().optional().describe('JSON access control policy'),
      kmsMasterKeyId: z
        .string()
        .optional()
        .describe('KMS key ID for server-side encryption (empty string to disable)'),
      tracingConfig: z
        .enum(['PassThrough', 'Active'])
        .optional()
        .describe('X-Ray tracing mode'),
      contentBasedDeduplication: z
        .boolean()
        .optional()
        .describe('Enable content-based deduplication (FIFO topics only)'),
      archivePolicy: z
        .string()
        .optional()
        .describe('JSON message retention policy (FIFO topics only)'),
      addTags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Tags to add or update on the topic'),
      removeTagKeys: z
        .array(z.string())
        .optional()
        .describe('Tag keys to remove from the topic')
    })
  )
  .output(
    z.object({
      topicArn: z.string().describe('ARN of the updated topic'),
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

    let attrUpdates: Array<{ name: string; value: string }> = [];
    if (ctx.input.displayName !== undefined) {
      attrUpdates.push({ name: 'DisplayName', value: ctx.input.displayName });
    }
    if (ctx.input.deliveryPolicy !== undefined) {
      attrUpdates.push({ name: 'DeliveryPolicy', value: ctx.input.deliveryPolicy });
    }
    if (ctx.input.policy !== undefined) {
      attrUpdates.push({ name: 'Policy', value: ctx.input.policy });
    }
    if (ctx.input.kmsMasterKeyId !== undefined) {
      attrUpdates.push({ name: 'KmsMasterKeyId', value: ctx.input.kmsMasterKeyId });
    }
    if (ctx.input.tracingConfig !== undefined) {
      attrUpdates.push({ name: 'TracingConfig', value: ctx.input.tracingConfig });
    }
    if (ctx.input.contentBasedDeduplication !== undefined) {
      attrUpdates.push({
        name: 'ContentBasedDeduplication',
        value: String(ctx.input.contentBasedDeduplication)
      });
    }
    if (ctx.input.archivePolicy !== undefined) {
      attrUpdates.push({ name: 'ArchivePolicy', value: ctx.input.archivePolicy });
    }

    for (let attr of attrUpdates) {
      await client.setTopicAttributes(ctx.input.topicArn, attr.name, attr.value);
      updatedAttributes.push(attr.name);
    }

    if (ctx.input.addTags && Object.keys(ctx.input.addTags).length > 0) {
      await client.tagResource(
        ctx.input.topicArn,
        ctx.input.addTags as Record<string, string>
      );
      updatedAttributes.push('Tags (added)');
    }

    if (ctx.input.removeTagKeys && ctx.input.removeTagKeys.length > 0) {
      await client.untagResource(ctx.input.topicArn, ctx.input.removeTagKeys);
      updatedAttributes.push('Tags (removed)');
    }

    return {
      output: {
        topicArn: ctx.input.topicArn,
        updatedAttributes
      },
      message: `Updated topic \`${ctx.input.topicArn}\` — changed: ${updatedAttributes.join(', ') || 'nothing'}`
    };
  })
  .build();
