import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nextBefore } from '../lib/client';
import { spec } from '../spec';

export let getUptimeHistory = SlateTool.create(spec, {
  name: 'Get Uptime History',
  key: 'get_uptime_history',
  description: `Retrieve historical test results, uptime/downtime periods, and alert history for a specific uptime check. Returns past test runs with status codes and performance data, time periods of uptime and downtime with durations, and triggered alert records.`,
  instructions: [
    'Specify which history type to retrieve: "runs" for individual test executions, "periods" for uptime/downtime time windows, or "alerts" for alert history.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the uptime test'),
      historyType: z
        .enum(['runs', 'periods', 'alerts'])
        .describe('Type of history to retrieve'),
      before: z
        .string()
        .optional()
        .describe('RFC3339 date or UNIX-seconds string to filter results before'),
      after: z
        .string()
        .optional()
        .describe('RFC3339 date or UNIX-seconds string to filter results after'),
      limit: z
        .number()
        .optional()
        .describe('Number of results per response, between 1 and 100'),
      page: z
        .number()
        .optional()
        .describe('Legacy first-page selector; use before/after cursors for continuation')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.any())).describe('List of history records'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Pagination and metadata information'),
      links: z.record(z.string(), z.any()).optional().describe('Provider continuation links'),
      nextBefore: z
        .string()
        .optional()
        .describe('UNIX-seconds cursor to pass as before for the next response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let params = {
      before: ctx.input.before,
      after: ctx.input.after,
      limit: ctx.input.limit,
      page: ctx.input.page
    };

    let result: Awaited<ReturnType<Client['listUptimeTestHistory']>>;
    if (ctx.input.historyType === 'runs') {
      result = await client.listUptimeTestHistory(ctx.input.testId, params);
    } else if (ctx.input.historyType === 'periods') {
      result = await client.listUptimeTestPeriods(ctx.input.testId, params);
    } else {
      result = await client.listUptimeTestAlerts(ctx.input.testId, params);
    }

    let records = result.data;
    let metadata = result.metadata;

    return {
      output: { records, metadata, links: result.links, nextBefore: nextBefore(result.links) },
      message: `Retrieved **${records.length}** ${ctx.input.historyType} record(s) for uptime test **${ctx.input.testId}**.`
    };
  })
  .build();
