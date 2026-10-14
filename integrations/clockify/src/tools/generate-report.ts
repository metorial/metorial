import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let generateDetailedReport = SlateTool.create(spec, {
  name: 'Generate Detailed Report',
  key: 'generate_detailed_report',
  description: `Generate a detailed time entry report from the Clockify Reports API. Filter by date range, users, projects, clients, tasks, tags, billable status, and more. Returns individual time entries with full details. Call get_workspaces to discover the workspace ID.`,
  constraints: ['Free plan detailed report data is limited to a 31-day interval'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      timeZone: z
        .string()
        .optional()
        .describe(
          'Report time zone, such as Europe/London. Defaults to the user profile time zone.'
        ),
      dateRangeStart: z.string().describe('Start of date range in ISO 8601 format'),
      dateRangeEnd: z.string().describe('End of date range in ISO 8601 format'),
      userIds: z.array(z.string()).optional().describe('Filter by user IDs'),
      projectIds: z.array(z.string()).optional().describe('Filter by project IDs'),
      clientIds: z.array(z.string()).optional().describe('Filter by client IDs'),
      taskIds: z.array(z.string()).optional().describe('Filter by task IDs'),
      tagIds: z.array(z.string()).optional().describe('Filter by tag IDs'),
      billable: z.boolean().optional().describe('Filter by billable status'),
      description: z.string().optional().describe('Filter by description text'),
      page: z.number().int().min(1).optional().describe('Detailed report page (1-based)'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Detailed report entries per page'),
      sortOrder: z
        .enum(['ASCENDING', 'DESCENDING'])
        .optional()
        .describe('Sort order by start time')
    })
  )
  .output(
    z.object({
      timeEntries: z.array(
        z.object({
          timeEntryId: z.string().optional(),
          description: z.string().optional(),
          projectName: z.string().optional(),
          clientName: z.string().optional(),
          taskName: z.string().optional(),
          userName: z.string().optional(),
          userEmail: z.string().optional(),
          start: z.string().optional(),
          end: z.string().optional(),
          duration: z.number().optional().describe('Duration in seconds'),
          billable: z.boolean().optional(),
          amount: z.number().optional()
        })
      ),
      totalCount: z.number(),
      totals: z
        .object({
          totalTime: z.number().optional().describe('Total duration in seconds'),
          totalBillableTime: z
            .number()
            .optional()
            .describe('Total billable duration in seconds'),
          entriesCount: z.number().optional(),
          totalAmount: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    let reportData: Record<string, any> = {
      exportType: 'JSON',
      timeZone: ctx.input.timeZone,
      dateRangeStart: ctx.input.dateRangeStart,
      dateRangeEnd: ctx.input.dateRangeEnd,
      sortOrder: ctx.input.sortOrder,
      description: ctx.input.description,
      detailedFilter: {
        page: ctx.input.page ?? 1,
        pageSize: ctx.input.pageSize ?? 200
      }
    };

    if (ctx.input.userIds) {
      reportData.users = { ids: ctx.input.userIds, contains: 'CONTAINS', status: 'ALL' };
    }
    if (ctx.input.projectIds) {
      reportData.projects = { ids: ctx.input.projectIds, contains: 'CONTAINS', status: 'ALL' };
    }
    if (ctx.input.clientIds) {
      reportData.clients = { ids: ctx.input.clientIds, contains: 'CONTAINS', status: 'ALL' };
    }
    if (ctx.input.taskIds) {
      reportData.tasks = { ids: ctx.input.taskIds, contains: 'CONTAINS', status: 'ALL' };
    }
    if (ctx.input.tagIds) {
      reportData.tags = {
        ids: ctx.input.tagIds,
        containedInTimeentry: 'CONTAINS',
        status: 'ALL'
      };
    }
    if (ctx.input.billable !== undefined) {
      reportData.billable = ctx.input.billable;
    }

    let report = await client.getDetailedReport(reportData as any);

    let entries = (report.timeEntries ?? report.timeentries ?? []).map((e: any) => ({
      timeEntryId: e.get_id ?? e._id ?? e.id ?? undefined,
      description: e.description || undefined,
      projectName: e.projectName || undefined,
      clientName: e.clientName || undefined,
      taskName: e.taskName || undefined,
      userName: e.userName || undefined,
      userEmail: e.userEmail || undefined,
      start: e.timeInterval?.start || undefined,
      end: e.timeInterval?.end || undefined,
      duration: e.timeInterval?.duration ?? undefined,
      billable: e.billable,
      amount: e.amount ?? undefined
    }));

    return {
      output: {
        timeEntries: entries,
        totalCount: report.totals?.[0]?.entriesCount ?? entries.length,
        totals: report.totals?.[0]
          ? {
              totalTime: report.totals[0].totalTime ?? undefined,
              totalBillableTime: report.totals[0].totalBillableTime ?? undefined,
              entriesCount: report.totals[0].entriesCount ?? undefined,
              totalAmount: report.totals[0].totalAmount ?? undefined
            }
          : undefined
      },
      message: `Generated detailed report with **${entries.length}** entries.`
    };
  })
  .build();

export let generateSummaryReport = SlateTool.create(spec, {
  name: 'Generate Summary Report',
  key: 'generate_summary_report',
  description: `Generate a summary report from Clockify. Aggregates time entry data by project, user, client, task, tag, or time period. Useful for getting totals without individual entry details. Call get_workspaces to discover the workspace ID.`,
  constraints: ['Free plan summary report data is limited to a 31-day interval'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      timeZone: z
        .string()
        .optional()
        .describe(
          'Report time zone, such as Europe/London. Defaults to the user profile time zone.'
        ),
      dateRangeStart: z.string().describe('Start of date range in ISO 8601 format'),
      dateRangeEnd: z.string().describe('End of date range in ISO 8601 format'),
      groupBy: z
        .array(z.enum(['PROJECT', 'CLIENT', 'USER', 'TASK', 'TAG', 'DATE', 'TIMEENTRY']))
        .optional()
        .describe('How to group the summary (e.g., ["PROJECT", "TASK"])'),
      userIds: z.array(z.string()).optional().describe('Filter by user IDs'),
      projectIds: z.array(z.string()).optional().describe('Filter by project IDs'),
      clientIds: z.array(z.string()).optional().describe('Filter by client IDs'),
      tagIds: z.array(z.string()).optional().describe('Filter by tag IDs'),
      billable: z.boolean().optional().describe('Filter by billable status'),
      sortOrder: z.enum(['ASCENDING', 'DESCENDING']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      groups: z.array(z.any()).describe('Grouped summary data'),
      totals: z
        .object({
          totalTime: z.number().optional().describe('Total duration in seconds'),
          totalBillableTime: z.number().optional(),
          entriesCount: z.number().optional(),
          totalAmount: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    let reportData: Record<string, any> = {
      exportType: 'JSON',
      timeZone: ctx.input.timeZone,
      dateRangeStart: ctx.input.dateRangeStart,
      dateRangeEnd: ctx.input.dateRangeEnd,
      sortOrder: ctx.input.sortOrder,
      summaryFilter: {
        groups: ctx.input.groupBy || ['PROJECT']
      }
    };

    if (ctx.input.userIds) {
      reportData.users = { ids: ctx.input.userIds, contains: 'CONTAINS', status: 'ALL' };
    }
    if (ctx.input.projectIds) {
      reportData.projects = { ids: ctx.input.projectIds, contains: 'CONTAINS', status: 'ALL' };
    }
    if (ctx.input.clientIds) {
      reportData.clients = { ids: ctx.input.clientIds, contains: 'CONTAINS', status: 'ALL' };
    }
    if (ctx.input.tagIds) {
      reportData.tags = {
        ids: ctx.input.tagIds,
        containedInTimeentry: 'CONTAINS',
        status: 'ALL'
      };
    }
    if (ctx.input.billable !== undefined) {
      reportData.billable = ctx.input.billable;
    }

    let report = await client.getSummaryReport(reportData as any);

    return {
      output: {
        groups: report.groupOne || [],
        totals: report.totals?.[0]
          ? {
              totalTime: report.totals[0].totalTime ?? undefined,
              totalBillableTime: report.totals[0].totalBillableTime ?? undefined,
              entriesCount: report.totals[0].entriesCount ?? undefined,
              totalAmount: report.totals[0].totalAmount ?? undefined
            }
          : undefined
      },
      message: `Generated summary report.`
    };
  })
  .build();
