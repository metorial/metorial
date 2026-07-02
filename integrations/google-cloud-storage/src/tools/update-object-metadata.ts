import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateObjectMetadata = SlateTool.create(spec, {
  name: 'Update Object Metadata',
  key: 'update_object_metadata',
  description: `Update metadata on an existing object in a Cloud Storage bucket. Supports changing content type, content disposition, cache control, custom metadata, and object holds.`
})
  .scopes(googleCloudStorageActionScopes.updateObjectMetadata)
  .input(
    z.object({
      bucketName: z.string().describe('Name of the bucket containing the object'),
      objectName: z.string().describe('Full name (path) of the object'),
      contentType: z.string().optional().describe('New MIME type for the object'),
      contentDisposition: z
        .string()
        .optional()
        .describe('Content-Disposition header (e.g., "attachment; filename=file.txt")'),
      cacheControl: z
        .string()
        .optional()
        .describe('Cache-Control header (e.g., "public, max-age=3600")'),
      contentEncoding: z.string().optional().describe('Content encoding (e.g., "gzip")'),
      contentLanguage: z.string().optional().describe('Content language (e.g., "en")'),
      customMetadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata. Replaces all existing custom metadata.'),
      temporaryHold: z
        .boolean()
        .optional()
        .describe('Place or release a temporary hold on the object'),
      eventBasedHold: z
        .boolean()
        .optional()
        .describe('Place or release an event-based hold on the object')
    })
  )
  .output(
    z.object({
      objectName: z.string(),
      bucketName: z.string(),
      contentType: z.string().optional(),
      updatedAt: z.string().optional(),
      generation: z.string().optional(),
      temporaryHold: z.boolean().optional(),
      eventBasedHold: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let patchBody: Record<string, any> = {};

    if (ctx.input.contentType) patchBody.contentType = ctx.input.contentType;
    if (ctx.input.contentDisposition)
      patchBody.contentDisposition = ctx.input.contentDisposition;
    if (ctx.input.cacheControl) patchBody.cacheControl = ctx.input.cacheControl;
    if (ctx.input.contentEncoding) patchBody.contentEncoding = ctx.input.contentEncoding;
    if (ctx.input.contentLanguage) patchBody.contentLanguage = ctx.input.contentLanguage;
    if (ctx.input.customMetadata) patchBody.metadata = ctx.input.customMetadata;
    if (ctx.input.temporaryHold !== undefined)
      patchBody.temporaryHold = ctx.input.temporaryHold;
    if (ctx.input.eventBasedHold !== undefined)
      patchBody.eventBasedHold = ctx.input.eventBasedHold;

    let result = await client.updateObjectMetadata(
      ctx.input.bucketName,
      ctx.input.objectName,
      patchBody
    );

    return {
      output: {
        objectName: result.name,
        bucketName: result.bucket,
        contentType: result.contentType,
        updatedAt: result.updated,
        generation: result.generation,
        temporaryHold: result.temporaryHold,
        eventBasedHold: result.eventBasedHold
      },
      message: `Updated metadata for object **${result.name}** in bucket **${result.bucket}**.`
    };
  })
  .build();
