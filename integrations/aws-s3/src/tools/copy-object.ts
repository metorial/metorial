import { SlateTool } from 'slates';
import { z } from 'zod';
import { S3Client } from '../lib/client';
import { spec } from '../spec';

export let copyObjectTool = SlateTool.create(spec, {
  name: 'Copy Object',
  key: 'copy_object',
  description: `Copy an object within or between S3 buckets. Can copy to a different key in the same bucket or to a different bucket entirely.
Optionally replace metadata during copy by setting **metadataDirective** to \`REPLACE\`.`,
  constraints: [
    'Maximum object size for single copy is 5 GB. For larger objects, use multipart copy.',
    'Source and destination must be accessible with the provided credentials.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sourceBucketName: z.string().describe('Bucket containing the source object'),
      sourceObjectKey: z.string().describe('Key of the source object to copy'),
      destinationBucketName: z.string().describe('Bucket for the destination object'),
      destinationObjectKey: z.string().describe('Key for the destination object'),
      sourceVersionId: z
        .string()
        .optional()
        .describe('Specific version of the source object to copy'),
      metadataDirective: z
        .enum(['COPY', 'REPLACE'])
        .optional()
        .describe('Whether to copy or replace metadata (default: COPY)'),
      contentType: z
        .string()
        .optional()
        .describe('Content type for the destination (requires REPLACE metadata directive)'),
      storageClass: z
        .enum([
          'STANDARD',
          'REDUCED_REDUNDANCY',
          'STANDARD_IA',
          'ONEZONE_IA',
          'INTELLIGENT_TIERING',
          'GLACIER',
          'DEEP_ARCHIVE',
          'GLACIER_IR'
        ])
        .optional()
        .describe('Storage class for the destination object'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata for the destination (requires REPLACE metadata directive)')
    })
  )
  .output(
    z.object({
      destinationBucketName: z.string().describe('Bucket of the copied object'),
      destinationObjectKey: z.string().describe('Key of the copied object'),
      eTag: z.string().describe('Entity tag of the copied object'),
      lastModified: z.string().describe('Last modified timestamp of the copy'),
      versionId: z.string().optional().describe('Version ID of the new copy')
    })
  )
  .handleInvocation(async ctx => {
    let client = new S3Client({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result = await client.copyObject(
      ctx.input.sourceBucketName,
      ctx.input.sourceObjectKey,
      ctx.input.destinationBucketName,
      ctx.input.destinationObjectKey,
      {
        sourceVersionId: ctx.input.sourceVersionId,
        metadataDirective: ctx.input.metadataDirective,
        contentType: ctx.input.contentType,
        storageClass: ctx.input.storageClass,
        metadata: ctx.input.metadata
      }
    );

    return {
      output: {
        destinationBucketName: ctx.input.destinationBucketName,
        destinationObjectKey: ctx.input.destinationObjectKey,
        eTag: result.eTag,
        lastModified: result.lastModified,
        versionId: result.versionId
      },
      message: `Copied \`${ctx.input.sourceObjectKey}\` from \`${ctx.input.sourceBucketName}\` to \`${ctx.input.destinationObjectKey}\` in \`${ctx.input.destinationBucketName}\`.`
    };
  })
  .build();
