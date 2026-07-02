import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunscopeClient } from '../lib/runscope-client';
import { spec } from '../spec';

export let manageBucket = SlateTool.create(spec, {
  name: 'Manage Monitoring Bucket',
  key: 'manage_bucket',
  description: `List, create, or delete API monitoring buckets. Buckets are containers that organize monitoring tests in BlazeMeter's API Monitoring (Runscope).`,
  instructions: [
    'Use "list" to see all available buckets.',
    'Use "create" with a **name** to create a new bucket.',
    'Use "delete" with a **bucketKey** to remove a bucket.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Operation to perform'),
      bucketKey: z.string().optional().describe('Bucket key (required for delete)'),
      name: z.string().optional().describe('Bucket name (required for create)'),
      teamUuid: z.string().optional().describe('Team UUID to associate the bucket with')
    })
  )
  .output(
    z.object({
      buckets: z
        .array(
          z.object({
            bucketKey: z.string().describe('Bucket key identifier'),
            name: z.string().describe('Bucket name'),
            testsUrl: z.string().optional().describe('URL to access tests in this bucket'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of buckets'),
      bucketKey: z.string().optional().describe('Created bucket key'),
      name: z.string().optional().describe('Bucket name'),
      deleted: z.boolean().optional().describe('Whether the bucket was deleted')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.runscopeToken && !ctx.auth.token) {
      throw new Error('Runscope OAuth token is required for API Monitoring operations');
    }
    let client = new RunscopeClient({ token: ctx.auth.runscopeToken || ctx.auth.token });

    if (ctx.input.action === 'list') {
      let buckets = await client.listBuckets();
      let mapped = buckets.map((b: any) => ({
        bucketKey: b.key,
        name: b.name,
        testsUrl: b.tests_url,
        createdAt: b.created_at ? String(b.created_at) : undefined
      }));
      return {
        output: { buckets: mapped },
        message: `Found **${mapped.length}** bucket(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for creating a bucket');
      let bucket = await client.createBucket({
        name: ctx.input.name,
        teamUuid: ctx.input.teamUuid
      });
      return {
        output: { bucketKey: bucket.key, name: bucket.name },
        message: `Created bucket **${bucket.name}** (key: \`${bucket.key}\`).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.bucketKey) throw new Error('bucketKey is required for deleting a bucket');
      await client.deleteBucket(ctx.input.bucketKey);
      return {
        output: { bucketKey: ctx.input.bucketKey, deleted: true },
        message: `Deleted bucket \`${ctx.input.bucketKey}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
