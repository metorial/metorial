import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createApiClient,
  pausePipelineRun,
  resumePipelineRun,
  terminatePipelineRun
} from '../lib/client';
import { spec } from '../spec';

export let controlPipelineRunTool = SlateTool.create(spec, {
  name: 'Control Pipeline Run',
  key: 'control_pipeline_run',
  description: `Control an active pipeline run by terminating, pausing, or resuming it. Use this to manage long-running or stuck pipeline executions.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      pipelineId: z.string().describe('ID of the pipeline'),
      action: z
        .enum(['terminate', 'pause', 'resume'])
        .describe('Action to perform on the pipeline run'),
      runIds: z
        .array(z.string())
        .describe(
          'Run IDs to control. For terminate and pause, only the first ID is used. For resume, all IDs are used.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);

    if (ctx.input.action === 'terminate') {
      await terminatePipelineRun(api, ctx.input.pipelineId, ctx.input.runIds[0]!);
    } else if (ctx.input.action === 'pause') {
      await pausePipelineRun(api, ctx.input.pipelineId, ctx.input.runIds[0]!);
    } else if (ctx.input.action === 'resume') {
      await resumePipelineRun(api, ctx.input.pipelineId, ctx.input.runIds);
    }

    return {
      output: { success: true },
      message: `Pipeline run **${ctx.input.action}** action completed successfully for pipeline \`${ctx.input.pipelineId}\`.`
    };
  })
  .build();
