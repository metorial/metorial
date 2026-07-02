import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';

export let copyObject = SlateTool.create(spec, {
  name: 'Copy Object',
  key: 'copy_object',
  description: `Copy an object within or between Cloud Storage buckets. The source object remains unchanged. Can also be used to rename or move an object by setting **deleteSource** to true.`
})
  .scopes(googleCloudStorageActionScopes.copyObject)
  .input(
    z.object({
      sourceBucket: z.string().describe('Name of the source bucket'),
      sourceObject: z.string().describe('Full name (path) of the source object'),
      destinationBucket: z.string().describe('Name of the destination bucket'),
      destinationObject: z.string().describe('Full name (path) for the destination object'),
      deleteSource: z
        .boolean()
        .optional()
        .describe('Delete the source object after copying (effectively a move/rename)')
    })
  )
  .output(
    z.object({
      objectName: z.string(),
      bucketName: z.string(),
      sizeBytes: z.string().optional(),
      contentType: z.string().optional(),
      generation: z.string().optional(),
      sourceDeleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result: any;

    if (ctx.input.deleteSource) {
      result = await client.moveObject(
        ctx.input.sourceBucket,
        ctx.input.sourceObject,
        ctx.input.destinationBucket,
        ctx.input.destinationObject
      );
    } else {
      result = await client.copyObject(
        ctx.input.sourceBucket,
        ctx.input.sourceObject,
        ctx.input.destinationBucket,
        ctx.input.destinationObject
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
        sourceDeleted: ctx.input.deleteSource || false
      },
      message: `${ctx.input.deleteSource ? 'Moved' : 'Copied'} **${ctx.input.sourceObject}** → **${ctx.input.destinationObject}** in bucket **${ctx.input.destinationBucket}**.`
    };
  })
  .build();
