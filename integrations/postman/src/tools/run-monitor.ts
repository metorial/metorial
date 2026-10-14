import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runMonitorTool = SlateTool.create(spec, {
  name: 'Run Monitor',
  key: 'run_monitor',
  description: `Trigger a Postman monitor run. Synchronous runs return assertion results, request statistics, and failures when complete. Asynchronous or long-running jobs can be checked with manage_monitor action get.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      monitorId: z.string().describe('ID of the monitor to run'),
      async: z
        .boolean()
        .optional()
        .describe('Start asynchronously; check lastRun with manage_monitor action get')
    })
  )
  .output(
    z.object({
      status: z.string().optional(),
      jobId: z.string().optional(),
      monitorId: z.string().optional(),
      startedAt: z.string().optional(),
      finishedAt: z.string().optional(),
      totalAssertions: z.number().optional(),
      failedAssertions: z.number().optional(),
      totalRequests: z.number().optional(),
      failures: z.array(z.any()).optional(),
      executions: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let run = await client.runMonitor(ctx.input.monitorId, ctx.input.async);

    let info = run?.info ?? {};
    let stats = run?.stats ?? {};

    return {
      output: {
        status: info.status,
        jobId: info.jobId,
        monitorId: info.monitorId ?? ctx.input.monitorId,
        startedAt: info.startedAt,
        finishedAt: info.finishedAt,
        totalAssertions: stats.assertions?.total,
        failedAssertions: stats.assertions?.failed,
        totalRequests: stats.requests?.total,
        failures: run?.failures ?? undefined,
        executions: run?.executions
      },
      message: info.finishedAt
        ? `Monitor run completed with status **${info.status ?? 'unknown'}**. ${stats.assertions?.failed !== undefined ? `${stats.assertions.failed} assertion(s) failed.` : ''}`
        : `Monitor run requested with status **${info.status ?? 'pending'}**. Check manage_monitor action get for its last run results.`
    };
  })
  .build();
