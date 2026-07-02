import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadBlob = SlateTool.create(spec, {
  name: 'Upload Blob',
  key: 'upload_blob',
  description: `Upload content as a blob to a container. Supports setting content type, access tier, metadata, and cache control. Creates a new blob or overwrites an existing one with the same name.`,
  instructions: [
    'For text content, set an appropriate contentType like "text/plain" or "application/json".',
    'Access tier can only be set on block blobs.'
  ]
})
  .input(
    z.object({
      containerName: z.string().describe('Name of the container to upload to'),
      blobName: z.string().describe('Full name/path of the blob (e.g. "folder/file.txt")'),
      content: z.string().describe('Content to upload as the blob body'),
      contentType: z
        .string()
        .optional()
        .describe('MIME content type (default: application/octet-stream)'),
      blobType: z
        .enum(['BlockBlob', 'AppendBlob'])
        .optional()
        .describe('Type of blob to create (default: BlockBlob)'),
      accessTier: z
        .enum(['Hot', 'Cool', 'Cold', 'Archive'])
        .optional()
        .describe('Access tier for the blob'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('User-defined metadata key-value pairs'),
      contentEncoding: z.string().optional().describe('Content encoding (e.g. "gzip")'),
      cacheControl: z.string().optional().describe('Cache control header value'),
      contentDisposition: z.string().optional().describe('Content disposition header value')
    })
  )
  .output(
    z.object({
      containerName: z.string().describe('Container the blob was uploaded to'),
      blobName: z.string().describe('Name of the uploaded blob'),
      eTag: z.string().describe('ETag of the uploaded blob'),
      lastModified: z.string().describe('Last modification time'),
      blobUrl: z.string().describe('Full URL to access the blob')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    let result = await client.uploadBlob(
      ctx.input.containerName,
      ctx.input.blobName,
      ctx.input.content,
      {
        contentType: ctx.input.contentType,
        blobType: ctx.input.blobType,
        accessTier: ctx.input.accessTier,
        metadata: ctx.input.metadata,
        contentEncoding: ctx.input.contentEncoding,
        cacheControl: ctx.input.cacheControl,
        contentDisposition: ctx.input.contentDisposition
      }
    );

    let blobUrl = client.getBlobUrl(ctx.input.containerName, ctx.input.blobName);

    return {
      output: {
        containerName: ctx.input.containerName,
        blobName: ctx.input.blobName,
        eTag: result.eTag,
        lastModified: result.lastModified,
        blobUrl
      },
      message: `Blob **${ctx.input.blobName}** uploaded to container **${ctx.input.containerName}** (${ctx.input.content.length} characters).`
    };
  })
  .build();
