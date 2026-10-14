import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { TogglClient } from '../lib/client';
import { workspaceIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Generate a summary or detailed time tracking report for a workspace. Summary reports aggregate time data by grouping dimensions. Detailed reports return individual time entries. Useful for generating custom reports, billing, and analytics.`,
  instructions: [
    'Use "summary" type for aggregated overview (e.g., total hours per project or client).',
    'Use "detailed" type for individual time entry listings.',
    'Date range is required. Use ISO date format YYYY-MM-DD.',
    'Detailed reports return one page. Pass all returned nextId and nextRowNumber cursors as firstId and firstRowNumber with the same filters to fetch the next page.'
  ],
  constraints: ['Some report features require paid plans.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdInput,
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
        .describe(
          'For detailed: starting row number for pagination. Use nextRowNumber from the previous response.'
        ),
      firstId: z
        .number()
        .optional()
        .describe('For detailed: pagination cursor. Use nextId from the previous response.'),
      firstTimestamp: z
        .number()
        .optional()
        .describe('For detailed: pagination timestamp cursor supported by the provider')
    })
  )
  .output(
    z.object({
      reportType: z.string().describe('Type of report generated'),
      groups: z.array(z.any()).optional().describe('Summary report grouped data'),
      timeEntries: z.array(z.any()).optional().describe('Detailed report time entries'),
      totalSeconds: z
        .number()
        .nullable()
        .describe('Reported total tracked seconds, null if not supplied by the provider'),
      nextId: z
        .number()
        .nullable()
        .optional()
        .describe('Detailed report cursor for firstId, null when absent'),
      nextRowNumber: z
        .number()
        .nullable()
        .optional()
        .describe('Detailed report cursor for firstRowNumber, null when absent'),
      rawReport: z
        .any()
        .optional()
        .describe(
          'Complete report response, preserving provider-specific groups, totals and metadata'
        )
    })
  )
  .handleInvocation(async ctx => {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(ctx.input.startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(ctx.input.endDate) ||
      ctx.input.startDate > ctx.input.endDate
    ) {
      throw createApiServiceError(
        'Use a report date range in YYYY-MM-DD format with startDate no later than endDate.'
      );
    }
    let client = new TogglClient(ctx.auth.token, ctx.auth.defaultWorkspaceId);
    let wsId = await client.resolveWorkspaceId(ctx.input.workspaceId, ctx.config);

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

      let groups = Array.isArray(report)
        ? report
        : (report?.groups ?? report?.subgroups ?? []);
      let totalSeconds = report?.total_seconds ?? report?.totals?.seconds ?? null;

      return {
        output: {
          reportType: 'summary',
          groups: Array.isArray(groups) ? groups : [],
          totalSeconds,
          rawReport: report
        },
        message: `Generated summary report from ${ctx.input.startDate} to ${ctx.input.endDate}`
      };
    } else {
      let result = await client.getDetailedReport(wsId, {
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        projectIds: ctx.input.projectIds,
        clientIds: ctx.input.clientIds,
        tagIds: ctx.input.tagIds,
        userIds: ctx.input.userIds,
        billable: ctx.input.billable,
        firstRowNumber: ctx.input.firstRowNumber,
        firstId: ctx.input.firstId,
        firstTimestamp: ctx.input.firstTimestamp,
        pageSize: ctx.input.pageSize
      });

      let report = result.report;
      let timeEntries = report?.time_entries ?? report ?? [];
      let totalSeconds = report?.total_seconds ?? report?.totals?.seconds ?? null;

      return {
        output: {
          reportType: 'detailed',
          timeEntries: Array.isArray(timeEntries) ? timeEntries : [],
          totalSeconds,
          nextId:
            result.nextId !== null && Number.isSafeInteger(Number(result.nextId))
              ? Number(result.nextId)
              : null,
          nextRowNumber:
            result.nextRowNumber !== null && Number.isSafeInteger(Number(result.nextRowNumber))
              ? Number(result.nextRowNumber)
              : null,
          rawReport: report
        },
        message: `Generated detailed report from ${ctx.input.startDate} to ${ctx.input.endDate}`
      };
    }
  })
  .build();
