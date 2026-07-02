import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { databricksServiceError } from '../lib/errors';
import { spec } from '../spec';

export let runJob = SlateTool.create(spec, {
  name: 'Run Job',
  key: 'run_job',
  description: `Trigger an immediate run of an existing job, optionally with override parameters. Also supports cancelling a running job run.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['run_now', 'cancel']).describe('Whether to trigger a run or cancel one'),
      jobId: z.string().optional().describe('Job ID to trigger (required for run_now)'),
      runId: z.string().optional().describe('Run ID to cancel (required for cancel)'),
      notebookParams: z
        .record(z.string(), z.string())
        .optional()
        .describe('Parameters to pass to notebook tasks'),
      pythonParams: z.array(z.string()).optional().describe('Parameters for Python tasks'),
      jarParams: z.array(z.string()).optional().describe('Parameters for JAR tasks')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('ID of the triggered or cancelled run'),
      numberInJob: z.number().optional().describe('Sequence number of this run within the job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'cancel') {
      if (!ctx.input.runId) throw databricksServiceError('runId is required for cancel');
      await client.cancelJobRun(ctx.input.runId);
      return {
        output: { runId: ctx.input.runId },
        message: `Cancelled run **${ctx.input.runId}**.`
      };
    }

    if (!ctx.input.jobId) throw databricksServiceError('jobId is required for run_now');

    let result = await client.runJobNow(ctx.input.jobId, {
      notebookParams: ctx.input.notebookParams as Record<string, string> | undefined,
      pythonParams: ctx.input.pythonParams,
      jarParams: ctx.input.jarParams
    });

    return {
      output: {
        runId: String(result.run_id),
        numberInJob: result.number_in_job
      },
      message: `Triggered run **${result.run_id}** for job **${ctx.input.jobId}**.`
    };
  })
  .build();
