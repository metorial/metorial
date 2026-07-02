import { SlateTool } from 'slates';
import { z } from 'zod';
import { S3Client } from '../lib/client';
import { spec } from '../spec';

export let getObjectTool = SlateTool.create(spec, {
  name: 'Get Object',
  key: 'get_object',
  description: `Download an object from S3 or retrieve its metadata. Set **metadataOnly** to \`true\` to only fetch headers (HEAD request) without downloading the content.
Supports fetching specific versions of versioned objects.`,
  constraints: [
    'Content is returned as text. Binary files will not be properly represented.',
    'For large files, consider using presigned URLs instead of downloading directly.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bucketName: z.string().describe('Name of the S3 bucket'),
      objectKey: z.string().describe('Key (path) of the object to retrieve'),
      versionId: z
        .string()
        .optional()
        .describe('Specific version ID to retrieve (requires versioning enabled)'),
      metadataOnly: z
        .boolean()
        .optional()
        .describe('If true, only fetch metadata without downloading content (HEAD request)'),
      range: z
        .string()
        .optional()
        .describe('Byte range to retrieve (e.g., "bytes=0-999" for first 1000 bytes)')
    })
  )
  .output(
    z.object({
      content: z
        .string()
        .optional()
        .describe('Object content as text (omitted when metadataOnly is true)'),
      objectKey: z.string().describe('Key of the retrieved object'),
      contentType: z.string().optional().describe('MIME type of the object'),
      contentLength: z.number().optional().describe('Size of the object in bytes'),
      eTag: z.string().optional().describe('Entity tag (hash) of the object'),
      lastModified: z.string().optional().describe('Last modified timestamp'),
      storageClass: z.string().optional().describe('Storage class of the object'),
      versionId: z.string().optional().describe('Version ID of the retrieved object'),
      serverSideEncryption: z
        .string()
        .optional()
        .describe('Server-side encryption algorithm used'),
      metadata: z
        .record(z.string(), z.string())
        .describe('Custom user metadata attached to the object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new S3Client({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    if (ctx.input.metadataOnly) {
      let meta = await client.headObject(
        ctx.input.bucketName,
        ctx.input.objectKey,
        ctx.input.versionId
      );
      return {
        output: {
          objectKey: meta.objectKey,
          contentType: meta.contentType,
          contentLength: meta.contentLength,
          eTag: meta.eTag,
          lastModified: meta.lastModified,
          storageClass: meta.storageClass,
          versionId: meta.versionId,
          serverSideEncryption: meta.serverSideEncryption,
          metadata: meta.metadata
        },
        message: `Retrieved metadata for \`${ctx.input.objectKey}\` (${meta.contentType}, ${meta.contentLength} bytes).`
      };
    }

    let result = await client.getObject(ctx.input.bucketName, ctx.input.objectKey, {
      versionId: ctx.input.versionId,
      range: ctx.input.range
    });

    return {
      output: {
        content: result.content,
        objectKey: result.metadata.objectKey,
        contentType: result.metadata.contentType,
        contentLength: result.metadata.contentLength,
        eTag: result.metadata.eTag,
        lastModified: result.metadata.lastModified,
        storageClass: result.metadata.storageClass,
        versionId: result.metadata.versionId,
        serverSideEncryption: result.metadata.serverSideEncryption,
        metadata: result.metadata.metadata
      },
      message: `Downloaded \`${ctx.input.objectKey}\` from \`${ctx.input.bucketName}\` (${result.metadata.contentLength} bytes).`
    };
  })
  .build();
