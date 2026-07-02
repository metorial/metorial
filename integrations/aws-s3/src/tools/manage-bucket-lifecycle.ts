import { SlateTool } from 'slates';
import { z } from 'zod';
import { S3Client, type S3LifecycleRule } from '../lib/client';
import { hasS3ErrorCode, s3ServiceError } from '../lib/errors';
import { spec } from '../spec';

let transitionStorageClassSchema = z.enum([
  'GLACIER',
  'STANDARD_IA',
  'ONEZONE_IA',
  'INTELLIGENT_TIERING',
  'DEEP_ARCHIVE',
  'GLACIER_IR'
]);

let tagSchema = z.object({
  key: z.string().describe('Tag key'),
  value: z.string().describe('Tag value')
});

let expirationSchema = z.object({
  date: z.string().optional().describe('ISO 8601 date/time when matching objects expire'),
  days: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Number of days after object creation when matching objects expire'),
  expiredObjectDeleteMarker: z
    .boolean()
    .optional()
    .describe('Whether to remove expired object delete markers')
});

let transitionSchema = z.object({
  date: z.string().optional().describe('ISO 8601 date/time when matching objects transition'),
  days: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Number of days after object creation when matching objects transition'),
  storageClass: transitionStorageClassSchema.describe('Storage class to transition to')
});

let noncurrentVersionExpirationSchema = z.object({
  noncurrentDays: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Days after a version becomes noncurrent before it expires'),
  newerNoncurrentVersions: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Number of newer noncurrent versions to retain')
});

let noncurrentVersionTransitionSchema = z.object({
  noncurrentDays: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Days after a version becomes noncurrent before it transitions'),
  newerNoncurrentVersions: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Number of newer noncurrent versions to retain'),
  storageClass: transitionStorageClassSchema.describe('Storage class to transition to')
});

let lifecycleRuleSchema = z.object({
  id: z.string().max(255).optional().describe('Optional rule identifier'),
  status: z
    .enum(['Enabled', 'Disabled'])
    .default('Enabled')
    .describe('Whether the lifecycle rule is active'),
  prefix: z
    .string()
    .optional()
    .describe('Object key prefix filter. Omit all filters to match all objects.'),
  tagFilters: z
    .array(tagSchema)
    .max(10)
    .optional()
    .describe('Object tags that matching objects must have'),
  objectSizeGreaterThan: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Only match objects larger than this many bytes'),
  objectSizeLessThan: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Only match objects smaller than this many bytes'),
  expiration: expirationSchema.optional().describe('Current object expiration action'),
  transitions: z
    .array(transitionSchema)
    .optional()
    .describe('Current object storage-class transition actions'),
  noncurrentVersionExpiration: noncurrentVersionExpirationSchema
    .optional()
    .describe('Noncurrent version expiration action'),
  noncurrentVersionTransitions: z
    .array(noncurrentVersionTransitionSchema)
    .optional()
    .describe('Noncurrent version storage-class transition actions'),
  abortIncompleteMultipartUploadDays: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Days after initiation to abort incomplete multipart uploads')
});

let hasRuleAction = (rule: S3LifecycleRule) =>
  Boolean(
    rule.expiration ||
      rule.transitions?.length ||
      rule.noncurrentVersionExpiration ||
      rule.noncurrentVersionTransitions?.length ||
      rule.abortIncompleteMultipartUploadDays !== undefined
  );

let validateRule = (rule: S3LifecycleRule) => {
  if (!hasRuleAction(rule)) {
    throw s3ServiceError(
      `Lifecycle rule${rule.id ? ` "${rule.id}"` : ''} must include at least one action.`
    );
  }

  if (
    rule.expiration?.expiredObjectDeleteMarker !== undefined &&
    (rule.expiration.days !== undefined || rule.expiration.date !== undefined)
  ) {
    throw s3ServiceError(
      `Lifecycle rule${rule.id ? ` "${rule.id}"` : ''} cannot combine expiredObjectDeleteMarker with expiration days or date.`
    );
  }
};

export let manageBucketLifecycleTool = SlateTool.create(spec, {
  name: 'Manage Bucket Lifecycle',
  key: 'manage_bucket_lifecycle',
  description: `Get, set, or remove the lifecycle configuration for an S3 bucket. Lifecycle rules can expire objects, transition them to colder storage classes, manage noncurrent versions, and abort incomplete multipart uploads.`,
  constraints: [
    'Setting lifecycle rules replaces the complete existing lifecycle configuration.',
    'A bucket can have up to 1,000 lifecycle rules.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'set', 'delete'])
        .describe('Action to perform on the lifecycle configuration'),
      bucketName: z.string().describe('Name of the S3 bucket'),
      rules: z
        .array(lifecycleRuleSchema)
        .max(1000)
        .optional()
        .describe('Lifecycle rules to set (required for "set")')
    })
  )
  .output(
    z.object({
      bucketName: z.string().describe('Name of the bucket'),
      action: z.string().describe('Action that was performed'),
      rules: z.array(lifecycleRuleSchema).optional().describe('Lifecycle rules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new S3Client({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let { action, bucketName } = ctx.input;

    if (action === 'get') {
      try {
        let rules = await client.getBucketLifecycle(bucketName);
        return {
          output: { bucketName, action, rules },
          message: `Bucket \`${bucketName}\` has **${rules.length}** lifecycle rule(s).`
        };
      } catch (error) {
        if (!hasS3ErrorCode(error, 'NoSuchLifecycleConfiguration')) {
          throw error;
        }

        return {
          output: { bucketName, action, rules: [] },
          message: `Bucket \`${bucketName}\` does not have a lifecycle configuration.`
        };
      }
    }

    if (action === 'set') {
      let rules = (ctx.input.rules || []) as S3LifecycleRule[];
      if (rules.length === 0) {
        throw s3ServiceError('At least one lifecycle rule is required for the "set" action.');
      }

      for (let rule of rules) {
        validateRule(rule);
      }

      await client.putBucketLifecycle(bucketName, rules);
      return {
        output: { bucketName, action, rules },
        message: `Set **${rules.length}** lifecycle rule(s) on bucket \`${bucketName}\`.`
      };
    }

    await client.deleteBucketLifecycle(bucketName);
    return {
      output: { bucketName, action },
      message: `Deleted lifecycle configuration from bucket \`${bucketName}\`.`
    };
  })
  .build();
