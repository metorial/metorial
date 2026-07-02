import { SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Generate a summary or detailed time tracking report for a workspace. Summary reports aggregate time data by grouping dimensions. Detailed reports return individual time entries. Useful for generating custom reports, billing, and analytics.`,
  instructions: [
    'Use "summary" type for aggregated overview (e.g., total hours per project or client).',
    'Use "detailed" type for individual time entry listings.',
    'Date range is required. Use ISO date format YYYY-MM-DD.'
  ],
  constraints: ['Some report features require paid plans.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Uses the configured default if not provided.'),
      reportType: z.enum(['summary', 'detailed']).describe('Type of report to generate'),
      startDate: z.string().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().describe('End date (YYYY-MM-DD)'),
      grouping: z
        .string()
        .optional()
        .describe('For summary: grouping dimension (e.g., "projects", "clients", "users")'),
      subGrouping: z.string().optional().describe('For summary: sub-grouping dimension'),
      projectIds: z.array(z.number()).optional().describe('Filter by project IDs'),
      clientIds: z.array(z.number()).optional().describe('Filter by client IDs'),
      tagIds: z.array(z.number()).optional().describe('Filter by tag IDs'),
      userIds: z.array(z.number()).optional().describe('Filter by user IDs'),
      billable: z.boolean().optional().describe('Filter by billable status'),
      pageSize: z.number().optional().describe('For detailed: number of results per page'),
      firstRowNumber: z
        .number()
        .optional()
        .describe('For detailed: starting row number for pagination')
    })
  )
  .output(
    z.object({
      reportType: z.string().describe('Type of report generated'),
      groups: z.array(z.any()).optional().describe('Summary report grouped data'),
      timeEntries: z.array(z.any()).optional().describe('Detailed report time entries'),
      totalSeconds: z.number().nullable().describe('Total tracked seconds across results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TogglClient(ctx.auth.token);
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;

    if (ctx.input.reportType === 'summary') {
      let report = await client.getSummaryReport(wsId, {
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        grouping: ctx.input.grouping,
        subGrouping: ctx.input.subGrouping,
        projectIds: ctx.input.projectIds,
        clientIds: ctx.input.clientIds,
        tagIds: ctx.input.tagIds,
        userIds: ctx.input.userIds,
        billable: ctx.input.billable
      });

      let groups = report.groups ?? report.subgroups ?? [];
      let totalSeconds = report.total_seconds ?? report.total_grand ?? null;

      return {
        output: {
          reportType: 'summary',
          groups,
          totalSeconds
        },
        message: `Generated summary report from ${ctx.input.startDate} to ${ctx.input.endDate}`
      };
    } else {
      let report = await client.getDetailedReport(wsId, {
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        projectIds: ctx.input.projectIds,
        clientIds: ctx.input.clientIds,
        tagIds: ctx.input.tagIds,
        userIds: ctx.input.userIds,
        billable: ctx.input.billable,
        firstRowNumber: ctx.input.firstRowNumber,
        pageSize: ctx.input.pageSize
      });

      let timeEntries = report.time_entries ?? report ?? [];
      let totalSeconds = report.total_seconds ?? report.total_grand ?? null;

      return {
        output: {
          reportType: 'detailed',
          timeEntries: Array.isArray(timeEntries) ? timeEntries : [],
          totalSeconds
        },
        message: `Generated detailed report from ${ctx.input.startDate} to ${ctx.input.endDate}`
      };
    }
  })
  .build();
