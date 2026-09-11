import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';

export let getObject = SlateTool.create(spec, {
  name: 'Get Object',
  key: 'get_object',
  description: `Get an object's metadata and optionally download its content from a Cloud Storage bucket. By default only returns metadata; set **includeContent** to true to return a binary-safe downloadable file.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudStorageActionScopes.getObject)
  .input(
    z.object({
      bucketName: z.string().describe('Name of the bucket containing the object'),
      objectName: z.string().describe('Full name (path) of the object'),
      includeContent: z
        .boolean()
        .optional()
        .describe('Download and include the object content as a binary-safe file')
    })
  )
  .output(
    z.object({
      objectName: z.string(),
      bucketName: z.string(),
      sizeBytes: z.string().optional(),
      contentType: z.string().optional(),
      storageClass: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      generation: z.string().optional(),
      md5Hash: z.string().optional(),
      crc32c: z.string().optional(),
      customMetadata: z.record(z.string(), z.string()).optional(),
      temporaryHold: z.boolean().optional(),
      eventBasedHold: z.boolean().optional(),
      retentionExpiresAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let metadata = await client.getObjectMetadata(ctx.input.bucketName, ctx.input.objectName);

    let content: Buffer | undefined;
    if (ctx.input.includeContent) {
      content = await client.downloadObject(ctx.input.bucketName, ctx.input.objectName);
    }

    let contentType = metadata.contentType || 'application/octet-stream';
    let sizeBytes = metadata.size ?? (content ? String(content.byteLength) : undefined);

    return {
      output: {
        objectName: metadata.name,
        bucketName: metadata.bucket,
        sizeBytes,
        contentType,
        storageClass: metadata.storageClass,
        createdAt: metadata.timeCreated,
        updatedAt: metadata.updated,
        generation: metadata.generation,
        md5Hash: metadata.md5Hash,
        crc32c: metadata.crc32c,
        customMetadata: metadata.metadata,
        temporaryHold: metadata.temporaryHold,
        eventBasedHold: metadata.eventBasedHold,
        retentionExpiresAt: metadata.retentionExpirationTime
      },
      attachments:
        content !== undefined
          ? [createBase64Attachment(content.toString('base64'), contentType)]
          : undefined,
      message: `Retrieved object **${metadata.name}** from bucket **${metadata.bucket}** (${sizeBytes ?? 'unknown'} bytes, ${contentType}).${content !== undefined ? ' Downloadable file included.' : ''}`
    };
  })
  .build();
