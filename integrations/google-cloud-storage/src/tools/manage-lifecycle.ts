import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';

let lifecycleConditionSchema = z.object({
  age: z.number().optional().describe('Object age in days'),
  createdBefore: z
    .string()
    .optional()
    .describe('Objects created before this date (YYYY-MM-DD)'),
  numNewerVersions: z
    .number()
    .optional()
    .describe('Number of newer versions (for versioned buckets)'),
  isLive: z.boolean().optional().describe('Whether the object is live or noncurrent'),
  matchesStorageClass: z
    .array(z.string())
    .optional()
    .describe('Only apply if object is in one of these storage classes'),
  daysSinceNoncurrentTime: z
    .number()
    .optional()
    .describe('Days since the object became noncurrent'),
  daysSinceCustomTime: z.number().optional().describe("Days since the object's custom time")
});

let lifecycleRuleSchema = z.object({
  action: z.object({
    type: z
      .enum(['Delete', 'SetStorageClass', 'AbortIncompleteMultipartUpload'])
      .describe('Lifecycle action type'),
    storageClass: z
      .string()
      .optional()
      .describe('Target storage class (required for SetStorageClass)')
  }),
  condition: lifecycleConditionSchema
});

export let manageLifecycle = SlateTool.create(spec, {
  name: 'Manage Lifecycle Rules',
  key: 'manage_lifecycle',
  description: `Get or set lifecycle management rules on a Cloud Storage bucket. Lifecycle rules automate storage class transitions, object deletion, and cleanup of incomplete uploads based on configurable conditions.`,
  instructions: [
    'Use action "get" to view current rules, "set" to replace all rules, "add" to append a rule, or "clear" to remove all rules.',
    'SetStorageClass transitions: STANDARD → NEARLINE → COLDLINE → ARCHIVE (downgrade only).'
  ]
})
  .scopes(googleCloudStorageActionScopes.manageLifecycle)
  .input(
    z.object({
      bucketName: z.string().describe('Name of the bucket'),
      action: z
        .enum(['get', 'set', 'add', 'clear'])
        .describe('Operation to perform on lifecycle rules'),
      rules: z
        .array(lifecycleRuleSchema)
        .optional()
        .describe('Lifecycle rules (required for "set" action)'),
      rule: lifecycleRuleSchema.optional().describe('Single lifecycle rule to add')
    })
  )
  .output(
    z.object({
      bucketName: z.string(),
      rules: z.array(
        z.object({
          action: z.object({
            type: z.string(),
            storageClass: z.string().optional()
          }),
          condition: z.record(z.string(), z.any())
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    if (ctx.input.action === 'get') {
      let result = await client.getBucketLifecycle(ctx.input.bucketName);
      let rules = result.lifecycle?.rule || [];
      return {
        output: { bucketName: ctx.input.bucketName, rules },
        message: `Bucket **${ctx.input.bucketName}** has **${rules.length}** lifecycle rule(s).`
      };
    }

    if (ctx.input.action === 'set') {
      if (!ctx.input.rules) {
        throw new Error('rules are required for "set" action');
      }
      let result = await client.setBucketLifecycle(ctx.input.bucketName, {
        rule: ctx.input.rules
      });
      let rules = result.lifecycle?.rule || [];
      return {
        output: { bucketName: ctx.input.bucketName, rules },
        message: `Set **${rules.length}** lifecycle rule(s) on bucket **${ctx.input.bucketName}**.`
      };
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.rule) {
        throw new Error('rule is required for "add" action');
      }
      let current = await client.getBucketLifecycle(ctx.input.bucketName);
      let existingRules = current.lifecycle?.rule || [];
      existingRules.push(ctx.input.rule);

      let result = await client.setBucketLifecycle(ctx.input.bucketName, {
        rule: existingRules
      });
      let rules = result.lifecycle?.rule || [];
      return {
        output: { bucketName: ctx.input.bucketName, rules },
        message: `Added lifecycle rule to bucket **${ctx.input.bucketName}**. Now has **${rules.length}** rule(s).`
      };
    }

    // clear
    let _result = await client.setBucketLifecycle(ctx.input.bucketName, { rule: [] });
    return {
      output: { bucketName: ctx.input.bucketName, rules: [] },
      message: `Cleared all lifecycle rules from bucket **${ctx.input.bucketName}**.`
    };
  })
  .build();
