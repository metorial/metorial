import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBucket = SlateTool.create(spec, {
  name: 'Manage Bucket',
  key: 'manage_bucket',
  description: `Create, list, retrieve, or delete Data Lake buckets in Griptape Cloud. Buckets provide cloud storage for staging and integrating external data (PDFs, text files, etc.) with your AI applications. Also supports listing and deleting assets within a bucket.`,
  instructions: [
    'Use "create" to create a new storage bucket.',
    'Use "get" to retrieve bucket details.',
    'Use "list" to browse all buckets.',
    'Use "delete" to remove a bucket.',
    'Use "list_assets" to browse files in a bucket.',
    'Use "delete_asset" to remove a specific file from a bucket.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'delete', 'list_assets', 'delete_asset'])
        .describe('Operation to perform'),
      bucketId: z
        .string()
        .optional()
        .describe('Bucket ID (required for get, delete, list_assets, delete_asset)'),
      name: z.string().optional().describe('Bucket name (required for create)'),
      description: z.string().optional().describe('Bucket description (for create)'),
      assetName: z.string().optional().describe('Asset name (required for delete_asset)'),
      prefix: z.string().optional().describe('Filter assets by prefix (for list_assets)'),
      postfix: z
        .string()
        .optional()
        .describe('Filter assets by postfix/extension (for list_assets)'),
      page: z.number().optional().describe('Page number (for list)'),
      pageSize: z.number().optional().describe('Page size (for list)')
    })
  )
  .output(
    z.object({
      bucketId: z.string().optional().describe('Bucket ID'),
      name: z.string().optional().describe('Bucket name'),
      description: z.string().optional().describe('Bucket description'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the resource was deleted'),
      buckets: z
        .array(
          z.object({
            bucketId: z.string().describe('Bucket ID'),
            name: z.string().describe('Bucket name'),
            description: z.string().optional().describe('Description'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of buckets'),
      assets: z.any().optional().describe('List of assets in a bucket'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required for create');
      let result = await client.createBucket({
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: {
          bucketId: result.bucket_id,
          name: result.name,
          description: result.description,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Created bucket **${result.name}** (${result.bucket_id}).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.bucketId) throw new Error('bucketId is required for get');
      let result = await client.getBucket(ctx.input.bucketId);
      return {
        output: {
          bucketId: result.bucket_id,
          name: result.name,
          description: result.description,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Retrieved bucket **${result.name}**.`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.listBuckets({
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      let buckets = result.items.map((b: any) => ({
        bucketId: b.bucket_id,
        name: b.name,
        description: b.description,
        createdAt: b.created_at
      }));
      return {
        output: { buckets, totalCount: result.pagination.totalCount },
        message: `Found **${result.pagination.totalCount}** bucket(s).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.bucketId) throw new Error('bucketId is required for delete');
      await client.deleteBucket(ctx.input.bucketId);
      return {
        output: { bucketId: ctx.input.bucketId, deleted: true },
        message: `Deleted bucket ${ctx.input.bucketId}.`
      };
    }

    if (ctx.input.action === 'list_assets') {
      if (!ctx.input.bucketId) throw new Error('bucketId is required for list_assets');
      let result = await client.listAssets(ctx.input.bucketId, {
        prefix: ctx.input.prefix,
        postfix: ctx.input.postfix
      });
      return {
        output: { bucketId: ctx.input.bucketId, assets: result },
        message: `Listed assets in bucket ${ctx.input.bucketId}.`
      };
    }

    if (ctx.input.action === 'delete_asset') {
      if (!ctx.input.bucketId) throw new Error('bucketId is required for delete_asset');
      if (!ctx.input.assetName) throw new Error('assetName is required for delete_asset');
      await client.deleteAsset(ctx.input.bucketId, ctx.input.assetName);
      return {
        output: { bucketId: ctx.input.bucketId, deleted: true },
        message: `Deleted asset **${ctx.input.assetName}** from bucket ${ctx.input.bucketId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
