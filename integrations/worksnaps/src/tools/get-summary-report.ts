import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSummaryReport = SlateTool.create(spec, {
  name: 'Get Summary Report',
  key: 'get_summary_report',
  description: `Generate a manager summary report across projects. Provides aggregated time tracking data for the specified date range, optionally filtered by projects and users. Useful for high-level oversight and cross-project analysis.`,
  instructions: [
    'Maximum date range is 30 days.',
    'Dates must be in YYYY-MM-DD format.',
    'Use semicolons to separate multiple project IDs or user IDs.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z.string().describe('Start date in YYYY-MM-DD format'),
      toDate: z.string().describe('End date in YYYY-MM-DD format'),
      timezoneOffset: z
        .string()
        .optional()
        .describe('Timezone offset (defaults to user timezone)'),
      projectIds: z
        .string()
        .optional()
        .describe('Semicolon-separated project IDs to filter by'),
      userIds: z.string().optional().describe('Semicolon-separated user IDs to filter by')
    })
  )
  .output(
    z.object({
      report: z.record(z.string(), z.unknown()).describe('The generated summary report data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let report = await client.getSummaryReport({
      name: 'manager_report',
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      timezoneOffset: ctx.input.timezoneOffset,
      projectIds: ctx.input.projectIds,
      userIds: ctx.input.userIds
    });

    return {
      output: { report },
      message: `Generated summary report from **${ctx.input.fromDate}** to **${ctx.input.toDate}**.`
    };
  })
  .build();
