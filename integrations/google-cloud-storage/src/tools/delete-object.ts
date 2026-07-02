import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteObject = SlateTool.create(spec, {
  name: 'Delete Object',
  key: 'delete_object',
  description: `Permanently delete an object from a Cloud Storage bucket. Optionally specify a generation number to delete a specific version of a versioned object.`,
  tags: {
    destructive: true
  }
})
  .scopes(googleCloudStorageActionScopes.deleteObject)
  .input(
    z.object({
      bucketName: z.string().describe('Name of the bucket containing the object'),
      objectName: z.string().describe('Full name (path) of the object to delete'),
      generation: z
        .string()
        .optional()
        .describe(
          'Specific generation (version) of the object to delete. Omit to delete the latest version.'
        )
    })
  )
  .output(
    z.object({
      objectName: z.string(),
      bucketName: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    await client.deleteObject(ctx.input.bucketName, ctx.input.objectName, {
      generation: ctx.input.generation
    });

    return {
      output: {
        objectName: ctx.input.objectName,
        bucketName: ctx.input.bucketName,
        deleted: true
      },
      message: `Deleted object **${ctx.input.objectName}** from bucket **${ctx.input.bucketName}**.${ctx.input.generation ? ` (generation ${ctx.input.generation})` : ''}`
    };
  })
  .build();
