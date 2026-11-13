import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';

export let copyObject = SlateTool.create(spec, {
  name: 'Copy Object',
  key: 'copy_object',
  description: `Copy an object within or between Cloud Storage buckets. The source object remains unchanged. Can also be used to rename or move an object by setting **deleteSource** to true. A move removes the source only while the copied generation is still its live version; on a bucket with versioning the removed version is kept as a noncurrent version. Check **sourceDeleted** in the result.`
})
  .scopes(googleCloudStorageActionScopes.copyObject)
  .input(
    z.object({
      sourceBucket: z.string().describe('Name of the source bucket'),
      sourceObject: z.string().describe('Full name (path) of the source object'),
      sourceGeneration: z
        .string()
        .regex(/^[1-9]\d*$/)
        .optional()
        .describe(
          'Exact source generation to copy or move; use the generation from a finalization event.'
        ),
      ifGenerationMatch: z
        .string()
        .regex(/^(0|[1-9]\d*)$/)
        .optional()
        .describe(
          'Only write if the destination has this generation. Use 0 to require that the destination does not exist.'
        ),
      destinationBucket: z.string().describe('Name of the destination bucket'),
      destinationObject: z.string().describe('Full name (path) for the destination object'),
      deleteSource: z
        .boolean()
        .optional()
        .describe(
          'Remove the source object after copying (effectively a move/rename). The source is left in place when the copied generation is not, or is no longer, its live version.'
        )
    })
  )
  .output(
    z.object({
      objectName: z.string(),
      bucketName: z.string(),
      sizeBytes: z.string().optional(),
      contentType: z.string().optional(),
      generation: z.string().optional(),
      sourceDeleted: z
        .boolean()
        .optional()
        .describe(
          'Whether the source object was removed. False for a plain copy, and for a move whose copied generation was not the live version of the source.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result: any;
    let sourceDeleted = false;

    if (ctx.input.deleteSource) {
      let moved = await client.moveObject(
        ctx.input.sourceBucket,
        ctx.input.sourceObject,
        ctx.input.destinationBucket,
        ctx.input.destinationObject,
        {
          sourceGeneration: ctx.input.sourceGeneration,
          ifGenerationMatch: ctx.input.ifGenerationMatch
        }
      );
      result = moved.resource;
      sourceDeleted = moved.sourceDeleted;
    } else {
      result = await client.copyObject(
        ctx.input.sourceBucket,
        ctx.input.sourceObject,
        ctx.input.destinationBucket,
        ctx.input.destinationObject,
        undefined,
        {
          sourceGeneration: ctx.input.sourceGeneration,
          ifGenerationMatch: ctx.input.ifGenerationMatch
        }
      );
    }

    let resource = result.resource || result;

    return {
      output: {
        objectName: resource.name,
        bucketName: resource.bucket,
        sizeBytes: resource.size,
        contentType: resource.contentType,
        generation: resource.generation,
        sourceDeleted
      },
      message: `${sourceDeleted ? 'Moved' : 'Copied'} **${ctx.input.sourceObject}** → **${ctx.input.destinationObject}** in bucket **${ctx.input.destinationBucket}**.${
        ctx.input.deleteSource && !sourceDeleted
          ? ' The source was left in place because the copied generation is not its live version.'
          : ''
      }`
    };
  })
  .build();
