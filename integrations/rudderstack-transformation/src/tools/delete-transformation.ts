import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTransformation = SlateTool.create(spec, {
  name: 'Delete Transformation',
  key: 'delete_transformation',
  description: `Delete a RudderStack transformation by its ID. The transformation will be removed, but all its version revisions are permanently preserved and not deleted.`,
  constraints: ['Revisions are never deleted, even when the transformation is deleted.'],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      transformationId: z.string().describe('ID of the transformation to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.deleteTransformation(ctx.input.transformationId);

    return {
      output: { success: true },
      message: `Deleted transformation \`${ctx.input.transformationId}\`. Revisions are preserved.`
    };
  })
  .build();
