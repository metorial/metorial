import { SlateTool } from 'slates';
import { z } from 'zod';
import { S3Client } from '../lib/client';
import { spec } from '../spec';

export let deleteObjectsTool = SlateTool.create(spec, {
  name: 'Delete Objects',
  key: 'delete_objects',
  description: `Delete one or more objects from an S3 bucket. Supports deleting specific versions of versioned objects.
For a single object, provide one item in the array. For batch deletion, provide up to 1000 objects.`,
  constraints: ['Maximum of 1000 objects per request.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      bucketName: z.string().describe('Name of the S3 bucket'),
      objects: z
        .array(
          z.object({
            objectKey: z.string().describe('Key of the object to delete'),
            versionId: z
              .string()
              .optional()
              .describe('Specific version ID to delete (for versioned buckets)')
          })
        )
        .min(1)
        .max(1000)
        .describe('List of objects to delete')
    })
  )
  .output(
    z.object({
      deleted: z
        .array(
          z.object({
            objectKey: z.string().describe('Key of the deleted object'),
            versionId: z.string().optional().describe('Version ID that was deleted')
          })
        )
        .describe('Successfully deleted objects'),
      errors: z
        .array(
          z.object({
            objectKey: z.string().describe('Key of the object that failed to delete'),
            code: z.string().describe('Error code'),
            message: z.string().describe('Error message')
          })
        )
        .describe('Objects that failed to delete')
    })
  )
  .handleInvocation(async ctx => {
    let client = new S3Client({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result: {
      deleted: Array<{ objectKey: string; versionId?: string }>;
      errors: Array<{ objectKey: string; code: string; message: string }>;
    };

    if (ctx.input.objects.length === 1) {
      let obj = ctx.input.objects[0]!;
      let deleteResult = await client.deleteObject(
        ctx.input.bucketName,
        obj.objectKey,
        obj.versionId
      );
      result = {
        deleted: [{ objectKey: obj.objectKey, versionId: deleteResult.versionId }],
        errors: []
      };
    } else {
      result = await client.deleteObjects(ctx.input.bucketName, ctx.input.objects);
    }

    let errorInfo =
      result.errors.length > 0 ? ` with **${result.errors.length}** error(s)` : '';

    return {
      output: result,
      message: `Deleted **${result.deleted.length}** object(s) from \`${ctx.input.bucketName}\`${errorInfo}.`
    };
  })
  .build();
