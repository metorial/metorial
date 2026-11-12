import { createApiServiceError, SlateTool } from 'slates';
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
      generation: z
        .string()
        .regex(/^[1-9]\d*$/)
        .optional()
        .describe(
          'Exact object generation, for example from an object finalized event. Omit for the current generation.'
        ),
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

    let metadata = await client.getObjectMetadata(
      ctx.input.bucketName,
      ctx.input.objectName,
      ctx.input.generation
    );
    if (
      metadata.bucket !== ctx.input.bucketName ||
      metadata.name !== ctx.input.objectName ||
      typeof metadata.generation !== 'string' ||
      !/^[1-9]\d*$/.test(metadata.generation) ||
      (ctx.input.generation && metadata.generation !== ctx.input.generation)
    ) {
      throw createApiServiceError(
        'Cloud Storage returned metadata for an unexpected object generation.'
      );
    }
    let contentType = metadata.contentType || 'application/octet-stream';
    let sizeBytes = metadata.size;
    if (ctx.input.includeContent) {
      await ctx.addAttachment({
        type: 'url',
        url: `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(ctx.input.bucketName)}/o/${encodeURIComponent(ctx.input.objectName)}`,
        query: { alt: 'media', generation: metadata.generation },
        headers: { Authorization: `Bearer ${ctx.auth.token}` },
        mimeType: contentType
      });
    }

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
      message: `Retrieved object **${metadata.name}** from bucket **${metadata.bucket}** (${sizeBytes ?? 'unknown'} bytes, ${contentType}).${ctx.input.includeContent ? ' Downloadable file included.' : ''}`
    };
  })
  .build();
