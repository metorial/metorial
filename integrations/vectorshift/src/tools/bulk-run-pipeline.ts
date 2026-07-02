import { SlateTool } from 'slates';
import { z } from 'zod';
import { bulkRunPipeline, createApiClient } from '../lib/client';
import { spec } from '../spec';

export let bulkRunPipelineTool = SlateTool.create(spec, {
  name: 'Bulk Run Pipeline',
  key: 'bulk_run_pipeline',
  description: `Execute a VectorShift pipeline multiple times in a single request. Each run receives its own set of input key-value pairs. Useful for batch processing scenarios where the same pipeline needs to process multiple datasets.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pipelineId: z.string().describe('ID of the pipeline to run'),
      runs: z
        .array(
          z.object({
            inputs: z
              .record(z.string(), z.unknown())
              .describe('Key-value pairs of input data for this run'),
            conversationId: z
              .string()
              .optional()
              .describe('Conversation ID for maintaining context')
          })
        )
        .describe('Array of run configurations, each with its own inputs')
    })
  )
  .output(
    z.object({
      runOutputs: z
        .array(
          z.object({
            runId: z.string().describe('ID of the pipeline run'),
            outputs: z
              .record(z.string(), z.unknown())
              .describe('Key-value pairs of output data')
          })
        )
        .describe('Array of results for each run')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await bulkRunPipeline(api, ctx.input.pipelineId, ctx.input.runs);

    let runOutputs = (result.run_outputs ?? []).map(
      (r: { run_id?: string; outputs?: Record<string, unknown> }) => ({
        runId: r.run_id ?? '',
        outputs: r.outputs ?? {}
      })
    );

    return {
      output: { runOutputs },
      message: `Bulk execution of pipeline **${ctx.input.pipelineId}** completed with **${runOutputs.length}** runs.`
    };
  })
  .build();
