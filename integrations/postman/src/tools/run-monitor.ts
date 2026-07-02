import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runMonitorTool = SlateTool.create(spec, {
  name: 'Run Monitor',
  key: 'run_monitor',
  description: `Manually trigger a Postman monitor run and return the results. This executes the monitor's collection synchronously and returns detailed execution info including assertion results, request stats, and any failures.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      monitorId: z.string().describe('ID of the monitor to run')
    })
  )
  .output(
    z.object({
      status: z.string().optional(),
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
    let run = await client.runMonitor(ctx.input.monitorId);

    let info = run?.info ?? {};
    let stats = run?.stats ?? {};

    return {
      output: {
        status: info.status,
        startedAt: info.startedAt,
        finishedAt: info.finishedAt,
        totalAssertions: stats.assertions?.total,
        failedAssertions: stats.assertions?.failed,
        totalRequests: stats.requests?.total,
        failures: run?.failures ?? [],
        executions: run?.executions
      },
      message: `Monitor run completed with status **${info.status ?? 'unknown'}**. ${stats.assertions?.failed ? `⚠️ ${stats.assertions.failed} assertion(s) failed.` : '✅ All assertions passed.'}`
    };
  })
  .build();
