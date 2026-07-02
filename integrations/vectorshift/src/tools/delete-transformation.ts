import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, deleteTransformation } from '../lib/client';
import { spec } from '../spec';

export let deleteTransformationTool = SlateTool.create(spec, {
  name: 'Delete Transformation',
  key: 'delete_transformation',
  description: `Permanently delete a transformation from VectorShift. This action cannot be undone.`,
  constraints: ['This action is irreversible.'],
  tags: {
    destructive: true,
    readOnly: false
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
    let api = createApiClient(ctx.auth.token);
    await deleteTransformation(api, ctx.input.transformationId);

    return {
      output: { success: true },
      message: `Transformation \`${ctx.input.transformationId}\` deleted successfully.`
    };
  })
  .build();
