import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, createPipeline } from '../lib/client';
import { spec } from '../spec';

export let createPipelineTool = SlateTool.create(spec, {
  name: 'Create Pipeline',
  key: 'create_pipeline',
  description:
    'Create a named VectorShift pipeline and return its ID for later lookup and management.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().min(1).describe('Name of the pipeline'),
      description: z.string().optional().describe('Description of the pipeline')
    })
  )
  .output(z.object({ pipelineId: z.string().describe('ID of the created pipeline') }))
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await createPipeline(api, ctx.input);
    return {
      output: { pipelineId: result.id },
      message: `Created pipeline **${ctx.input.name}** with ID \`${result.id}\`.`
    };
  })
  .build();
