import { SlateTool } from 'slates';
import { z } from 'zod';
import { optionalString, requireArray, resource } from '../lib/client';
import { createClient, orgIdInput } from '../lib/helpers';
import { spec } from '../spec';

let retentionRuleSchema = z
  .object({
    type: z.string(),
    everySeconds: z.number(),
    shardGroupDurationSeconds: z.number().optional()
  })
  .passthrough();

export let bucketSchema = z.object({
  raw: z.any().optional().describe('Complete provider resource'),
  bucketId: z.string().describe('Unique bucket ID'),
  name: z.string().describe('Bucket name'),
  description: z.string().optional().describe('Bucket description'),
  orgId: z.string().optional().describe('Organization ID'),
  retentionRules: z.array(retentionRuleSchema).optional().describe('Retention rules'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  type: z.string().optional().describe('Bucket type (user or system)')
});

export let listBuckets = SlateTool.create(spec, {
  name: 'List Buckets',
  key: 'list_buckets',
  description: `List a page of buckets in the organization. Buckets are named storage locations for time-series data with configurable retention periods.
Supports filtering by name and pagination.`,
  instructions: [
    'Call list_organizations to discover orgId when organization scope is needed.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      after: z
        .string()
        .optional()
        .describe('Resource ID to seek after; use instead of offset'),
      name: z.string().optional().describe('Filter buckets by exact name'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of buckets to return (default: 20)'),
      offset: z.number().optional().describe('Number of buckets to skip for pagination')
    })
  )
  .output(
    z.object({
      raw: z.any().optional().describe('Complete provider response'),
      buckets: z.array(bucketSchema).describe('List of buckets')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listBuckets({
      name: ctx.input.name,
      after: ctx.input.after,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let buckets = requireArray(result, 'buckets').map((b: any) => ({
      raw: b,
      bucketId: resource(b, ['id', 'name']).id,
      name: b.name,
      description: optionalString(b.description),
      orgId: optionalString(b.orgID),
      retentionRules: Array.isArray(b.retentionRules) ? b.retentionRules : undefined,
      createdAt: optionalString(b.createdAt),
      updatedAt: optionalString(b.updatedAt),
      type: optionalString(b.type)
    }));

    return {
      output: { buckets, raw: result },
      message: `Found **${buckets.length}** bucket(s).`
    };
  })
  .build();

export let createBucket = SlateTool.create(spec, {
  name: 'Create Bucket',
  key: 'create_bucket',
  description: `Create a new bucket in the organization for storing time-series data.
A bucket is a named location with a configurable retention period that determines how long data is kept.`,
  constraints: ['InfluxDB Cloud Free Plan allows up to two buckets.'],
  instructions: [
    'Call list_organizations to discover orgId when organization scope is needed.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      name: z.string().describe('Name for the new bucket'),
      description: z.string().optional().describe('Description of the bucket'),
      retentionSeconds: z
        .number()
        .optional()
        .describe(
          'Data retention period in seconds (0 = infinite, default: 30 days = 2592000)'
        )
    })
  )
  .output(bucketSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.createBucket({
      name: ctx.input.name,
      description: ctx.input.description,
      retentionSeconds: ctx.input.retentionSeconds
    });

    return {
      output: {
        raw: result,
        bucketId: resource(result, ['id', 'name']).id,
        name: result.name,
        description: optionalString(result.description),
        orgId: optionalString(result.orgID),
        retentionRules: Array.isArray(result.retentionRules)
          ? result.retentionRules
          : undefined,
        createdAt: optionalString(result.createdAt),
        updatedAt: optionalString(result.updatedAt),
        type: optionalString(result.type)
      },
      message: `Created bucket **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

export let updateBucket = SlateTool.create(spec, {
  name: 'Update Bucket',
  key: 'update_bucket',
  description: `Update an existing bucket's name, description, or retention period.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bucketId: z.string().describe('ID of the bucket to update'),
      name: z.string().optional().describe('New name for the bucket'),
      description: z.string().optional().describe('New description for the bucket'),
      retentionSeconds: z
        .number()
        .optional()
        .describe('New data retention period in seconds (0 = infinite)')
    })
  )
  .output(bucketSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.updateBucket(ctx.input.bucketId, {
      name: ctx.input.name,
      description: ctx.input.description,
      retentionSeconds: ctx.input.retentionSeconds
    });

    return {
      output: {
        raw: result,
        bucketId: resource(result, ['id', 'name']).id,
        name: result.name,
        description: optionalString(result.description),
        orgId: optionalString(result.orgID),
        retentionRules: Array.isArray(result.retentionRules)
          ? result.retentionRules
          : undefined,
        createdAt: optionalString(result.createdAt),
        updatedAt: optionalString(result.updatedAt),
        type: optionalString(result.type)
      },
      message: `Updated bucket **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

export let deleteBucket = SlateTool.create(spec, {
  name: 'Delete Bucket',
  key: 'delete_bucket',
  description: `Permanently delete a bucket and all of its stored time-series data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      bucketId: z.string().describe('ID of the bucket to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the bucket was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteBucket(ctx.input.bucketId);

    return {
      output: { success: true },
      message: `Deleted bucket ${ctx.input.bucketId}.`
    };
  })
  .build();
