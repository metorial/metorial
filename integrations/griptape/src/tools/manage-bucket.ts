import { Buffer } from 'node:buffer';
import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageBucket = SlateTool.create(spec, {
  name: 'Manage Bucket',
  key: 'manage_bucket',
  description: `Create, list, retrieve, or delete Data Lake buckets in Griptape Cloud. Buckets provide cloud storage for staging and integrating external data (PDFs, text files, etc.) with your AI applications. Also supports updating buckets and listing, reading, uploading, downloading, and deleting files within a bucket.`,
  instructions: [
    'Use "create" to create a new storage bucket.',
    'Use "get" to retrieve bucket details.',
    'Use "list" to browse all buckets.',
    'Use "delete" to remove a bucket.',
    'Use "list_assets" to browse files in a bucket.',
    'Use "delete_asset" to remove a specific file from a bucket.',
    'Use "upload_asset" to upload text or base64-encoded file content.',
    'Use "download_asset" to prepare a downloadable file.',
    'Use "update" to rename a bucket.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'get',
          'list',
          'delete',
          'list_assets',
          'delete_asset',
          'update',
          'get_asset',
          'upload_asset',
          'download_asset'
        ])
        .describe('Operation to perform'),
      bucketId: z
        .string()
        .optional()
        .describe(
          'Bucket ID from manage_bucket list. Required for all operations except create and list.'
        ),
      name: z.string().optional().describe('Bucket name (required for create)'),
      description: z
        .string()
        .optional()
        .describe('Legacy field. Griptape Cloud supports bucket names only; omit this field.'),
      assetName: z
        .string()
        .optional()
        .describe(
          'Asset name required for get_asset, upload_asset, download_asset, and delete_asset.'
        ),
      content: z
        .string()
        .optional()
        .describe(
          'File content required for upload_asset, encoded according to contentEncoding.'
        ),
      contentEncoding: z
        .enum(['utf8', 'base64'])
        .optional()
        .describe('File content encoding for upload_asset; defaults to utf8.'),
      contentType: z
        .string()
        .optional()
        .describe(
          'File MIME type for upload_asset or download_asset; defaults to application/octet-stream.'
        ),
      prefix: z.string().optional().describe('Filter assets by prefix (for list_assets)'),
      postfix: z
        .string()
        .optional()
        .describe('Filter assets by postfix/extension (for list_assets)'),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Page number (for list or list_assets)'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Page size (for list or list_assets)')
    })
  )
  .output(
    z.object({
      bucketId: z.string().optional().describe('Bucket ID'),
      assetName: z.string().optional().describe('Name of the file in the bucket'),
      assetPath: z
        .string()
        .optional()
        .describe('Path usable by a knowledge base or Data Lake data source'),
      size: z.number().optional().describe('File size in bytes'),
      contentType: z.string().optional().describe('File MIME type'),
      uploaded: z.boolean().optional(),
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
      pagination: paginationSchema.optional().describe('Page navigation metadata'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw createApiServiceError('Name is required for create');
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

    if (ctx.input.action === 'update') {
      if (!ctx.input.bucketId || !ctx.input.name)
        throw createApiServiceError('bucketId and name are required for update.');
      if (ctx.input.description !== undefined)
        throw createApiServiceError(
          'Griptape Cloud buckets support a name only. Omit description.'
        );
      let result = await client.updateBucket(ctx.input.bucketId, ctx.input.name);
      return {
        output: {
          bucketId: result.bucket_id,
          name: result.name,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Updated bucket **${result.name}**.`
      };
    }

    if (['get_asset', 'upload_asset', 'download_asset'].includes(ctx.input.action)) {
      if (!ctx.input.bucketId || !ctx.input.assetName)
        throw createApiServiceError(
          'bucketId and assetName are required for this file operation.'
        );
      let contentType = ctx.input.contentType ?? 'application/octet-stream';
      let result: { name: string; size?: number; created_at?: string; updated_at?: string };
      if (ctx.input.action === 'upload_asset') {
        if (ctx.input.content === undefined)
          throw createApiServiceError('content is required for upload_asset.');
        if (
          ctx.input.contentEncoding === 'base64' &&
          !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
            ctx.input.content
          )
        )
          throw createApiServiceError(
            'content must be valid padded base64 when contentEncoding is base64.'
          );
        if (!/^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/.test(contentType))
          throw createApiServiceError('contentType must be a MIME type such as text/plain.');
        let content = Buffer.from(
          ctx.input.content,
          ctx.input.contentEncoding === 'base64' ? 'base64' : 'utf8'
        );
        result = await client.uploadAsset(
          ctx.input.bucketId,
          ctx.input.assetName,
          content,
          contentType
        );
      } else {
        result = await client.getAsset(ctx.input.bucketId, ctx.input.assetName);
      }
      if (ctx.input.action === 'download_asset') {
        let download = await client.getAssetDownload(ctx.input.bucketId, ctx.input.assetName);
        await ctx.addAttachment({
          type: 'url',
          url: download.url,
          headers: download.headers,
          mimeType: contentType,
          filename: ctx.input.assetName.split('/').pop(),
          refreshAt: download.expiresAt,
          refreshReference: { bucketId: ctx.input.bucketId, assetName: ctx.input.assetName }
        });
      }
      return {
        output: {
          bucketId: ctx.input.bucketId,
          assetName: result.name,
          assetPath: `buckets/${ctx.input.bucketId}/assets/${result.name}`,
          size: result.size,
          contentType,
          uploaded: ctx.input.action === 'upload_asset' ? true : undefined,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `${ctx.input.action === 'download_asset' ? 'Prepared a download for' : ctx.input.action === 'upload_asset' ? 'Uploaded' : 'Retrieved'} **${result.name}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.bucketId) throw createApiServiceError('bucketId is required for get');
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
        output: {
          buckets,
          pagination: result.pagination,
          totalCount: result.pagination.totalCount
        },
        message: `Found **${result.pagination.totalCount}** bucket(s).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.bucketId) throw createApiServiceError('bucketId is required for delete');
      await client.deleteBucket(ctx.input.bucketId);
      return {
        output: { bucketId: ctx.input.bucketId, deleted: true },
        message: `Deleted bucket ${ctx.input.bucketId}.`
      };
    }

    if (ctx.input.action === 'list_assets') {
      if (!ctx.input.bucketId)
        throw createApiServiceError('bucketId is required for list_assets');
      let result = await client.listAssets(ctx.input.bucketId, {
        prefix: ctx.input.prefix,
        postfix: ctx.input.postfix,
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      return {
        output: {
          bucketId: ctx.input.bucketId,
          assets: {
            ...result,
            assets: result.assets.map(
              ({ contents: _contents, ...asset }: Record<string, unknown>) => asset
            )
          },
          pagination: {
            pageNumber: result.pagination.page_number,
            pageSize: result.pagination.page_size,
            totalCount: result.pagination.total_count,
            totalPages: result.pagination.total_pages,
            nextPage: result.pagination.next_page ?? undefined,
            previousPage: result.pagination.previous_page ?? undefined
          }
        },
        message: `Listed assets in bucket ${ctx.input.bucketId}.`
      };
    }

    if (ctx.input.action === 'delete_asset') {
      if (!ctx.input.bucketId)
        throw createApiServiceError('bucketId is required for delete_asset');
      if (!ctx.input.assetName)
        throw createApiServiceError('assetName is required for delete_asset');
      await client.deleteAsset(ctx.input.bucketId, ctx.input.assetName);
      return {
        output: {
          bucketId: ctx.input.bucketId,
          assetName: ctx.input.assetName,
          deleted: true
        },
        message: `Deleted asset **${ctx.input.assetName}** from bucket ${ctx.input.bucketId}.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
