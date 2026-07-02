import { SlateTool } from 'slates';
import { z } from 'zod';
import { S3Client } from '../lib/client';
import { spec } from '../spec';

export let listObjectVersionsTool = SlateTool.create(spec, {
  name: 'List Object Versions',
  key: 'list_object_versions',
  description: `List all versions of objects in an S3 bucket, including delete markers. Requires versioning to be enabled on the bucket.
Use **prefix** to filter versions for a specific object or folder.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bucketName: z.string().describe('Name of the S3 bucket'),
      prefix: z
        .string()
        .optional()
        .describe('Filter versions by key prefix (use exact key for a single object)'),
      maxKeys: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum number of versions to return'),
      keyMarker: z
        .string()
        .optional()
        .describe('Start listing after this key (for pagination)'),
      versionIdMarker: z
        .string()
        .optional()
        .describe('Start listing after this version ID (for pagination, use with keyMarker)')
    })
  )
  .output(
    z.object({
      versions: z
        .array(
          z.object({
            objectKey: z.string().describe('Object key'),
            versionId: z.string().describe('Version identifier'),
            isLatest: z.boolean().describe('Whether this is the current version'),
            lastModified: z.string().describe('When this version was created'),
            eTag: z.string().describe('Entity tag (empty for delete markers)'),
            sizeBytes: z.number().describe('Size in bytes (0 for delete markers)'),
            storageClass: z.string().describe('Storage class'),
            isDeleteMarker: z.boolean().describe('Whether this version is a delete marker')
          })
        )
        .describe('Object versions and delete markers'),
      isTruncated: z.boolean().describe('Whether there are more results'),
      nextKeyMarker: z.string().optional().describe('Key marker for next page'),
      nextVersionIdMarker: z.string().optional().describe('Version ID marker for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new S3Client({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result = await client.listObjectVersions(ctx.input.bucketName, {
      prefix: ctx.input.prefix,
      maxKeys: ctx.input.maxKeys,
      keyMarker: ctx.input.keyMarker,
      versionIdMarker: ctx.input.versionIdMarker
    });

    let deleteMarkerCount = result.versions.filter(v => v.isDeleteMarker).length;
    let versionCount = result.versions.length - deleteMarkerCount;

    return {
      output: result,
      message: `Found **${versionCount}** version(s) and **${deleteMarkerCount}** delete marker(s) in \`${ctx.input.bucketName}\`${ctx.input.prefix ? ` with prefix \`${ctx.input.prefix}\`` : ''}.`
    };
  })
  .build();
