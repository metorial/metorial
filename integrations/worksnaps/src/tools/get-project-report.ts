import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProjectReport = SlateTool.create(spec, {
  name: 'Get Project Report',
  key: 'get_project_report',
  description: `Generate a time tracking report for a specific project. Supports two report types: **time_entries** (detailed per-entry data) and **time_summary** (aggregated time totals). Useful for billing, payroll, and productivity analysis.`,
  instructions: [
    'Timestamps must align to 10-minute boundaries.',
    'Maximum date range is 30 days.',
    'For "time_entries" report, userIds is required.',
    'Use semicolons to separate multiple user IDs or task IDs.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the project'),
      reportType: z
        .enum(['time_entries', 'time_summary'])
        .describe('Type of report to generate'),
      fromTimestamp: z.string().describe('Start timestamp (Unix epoch, 10-minute boundary)'),
      toTimestamp: z.string().describe('End timestamp (Unix epoch, 10-minute boundary)'),
      userIds: z
        .string()
        .optional()
        .describe('Semicolon-separated user IDs (required for time_entries report)'),
      taskIds: z.string().optional().describe('Semicolon-separated task IDs to filter by'),
      timeEntryType: z.enum(['online', 'offline']).optional().describe('Filter by entry type')
    })
  )
  .output(
    z.object({
      report: z.record(z.string(), z.unknown()).describe('The generated report data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let report = await client.getProjectReport(ctx.input.projectId, {
      name: ctx.input.reportType,
      fromTimestamp: ctx.input.fromTimestamp,
      toTimestamp: ctx.input.toTimestamp,
      userIds: ctx.input.userIds,
      taskIds: ctx.input.taskIds,
      timeEntryType: ctx.input.timeEntryType
    });

    return {
      output: { report },
      message: `Generated **${ctx.input.reportType}** report for project **${ctx.input.projectId}**.`
    };
  })
  .build();
