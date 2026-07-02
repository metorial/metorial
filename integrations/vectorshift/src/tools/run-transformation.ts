import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, runTransformation } from '../lib/client';
import { spec } from '../spec';

export let runTransformationTool = SlateTool.create(spec, {
  name: 'Run Transformation',
  key: 'run_transformation',
  description: `Execute a transformation (arbitrary code) in VectorShift's isolated execution environment. Provide input key-value pairs matching the transformation's schema and receive computed results.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      transformationId: z.string().describe('ID of the transformation to run'),
      inputs: z
        .record(z.string(), z.unknown())
        .describe('Input key-value pairs matching the transformation input schema')
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('Computed result from the transformation')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await runTransformation(api, ctx.input.transformationId, ctx.input.inputs);

    return {
      output: {
        result: result.result ?? result
      },
      message: `Transformation \`${ctx.input.transformationId}\` executed successfully.`
    };
  })
  .build();
