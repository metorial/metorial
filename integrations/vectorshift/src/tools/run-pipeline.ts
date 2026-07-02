import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, runPipeline } from '../lib/client';
import { spec } from '../spec';

export let runPipelineTool = SlateTool.create(spec, {
  name: 'Run Pipeline',
  key: 'run_pipeline',
  description: `Execute a VectorShift pipeline with the provided inputs. Pipelines are AI workflows that process data through connected components. Provide input key-value pairs matching the pipeline's expected inputs and receive the computed outputs.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pipelineId: z.string().describe('ID of the pipeline to run'),
      inputs: z
        .record(z.string(), z.unknown())
        .describe('Key-value pairs of input data for the pipeline'),
      conversationId: z
        .string()
        .optional()
        .describe('Conversation ID for maintaining context across multiple runs')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('ID of the pipeline run'),
      outputs: z
        .record(z.string(), z.unknown())
        .describe('Key-value pairs of output data from the pipeline')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await runPipeline(api, ctx.input.pipelineId, {
      inputs: ctx.input.inputs,
      conversationId: ctx.input.conversationId
    });

    return {
      output: {
        runId: result.run_id ?? '',
        outputs: result.outputs ?? {}
      },
      message: `Pipeline **${ctx.input.pipelineId}** executed successfully. Run ID: \`${result.run_id}\``
    };
  })
  .build();
