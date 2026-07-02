import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRunStatus = SlateTool.create(spec, {
  name: 'Get Run Status',
  key: 'get_run_status',
  description: `Get the current status and details of a specific project run. Returns the run status (PENDING, RUNNING, ERRORED, COMPLETED, KILLED), timestamps, and elapsed time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('UUID of the project'),
      runId: z.string().describe('UUID of the run to check')
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      runId: z.string(),
      runUrl: z.string(),
      status: z.string(),
      startTime: z.string().nullable(),
      endTime: z.string().nullable(),
      elapsedTime: z.number().nullable(),
      traceId: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let run = await client.getRunStatus(ctx.input.projectId, ctx.input.runId);

    return {
      output: {
        projectId: run.projectId,
        runId: run.runId,
        runUrl: run.runUrl,
        status: run.status,
        startTime: run.startTime,
        endTime: run.endTime,
        elapsedTime: run.elapsedTime,
        traceId: run.traceId
      },
      message: `Run **${run.runId}** status: **${run.status}**${run.elapsedTime ? ` (${run.elapsedTime}ms)` : ''}.`
    };
  })
  .build();
