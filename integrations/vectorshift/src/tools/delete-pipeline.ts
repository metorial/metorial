import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, deletePipeline } from '../lib/client';
import { spec } from '../spec';

export let deletePipelineTool = SlateTool.create(spec, {
  name: 'Delete Pipeline',
  key: 'delete_pipeline',
  description: `Permanently delete a pipeline from VectorShift. This action cannot be undone.`,
  constraints: ['This action is irreversible.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      pipelineId: z.string().describe('ID of the pipeline to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    await deletePipeline(api, ctx.input.pipelineId);

    return {
      output: { success: true },
      message: `Pipeline \`${ctx.input.pipelineId}\` deleted successfully.`
    };
  })
  .build();
