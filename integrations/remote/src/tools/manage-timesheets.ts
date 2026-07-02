import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTimesheets = SlateTool.create(spec, {
  name: 'Manage Timesheets',
  key: 'manage_timesheets',
  description: `List, retrieve, or approve employee timesheets. View submitted timesheets for review and approve them for payroll processing.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'approve']).describe('Action to perform'),
      timesheetId: z.string().optional().describe('Timesheet ID (for get, approve)'),
      employmentId: z.string().optional().describe('Filter by employment ID when listing'),
      status: z.string().optional().describe('Filter by status when listing'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Page size')
    })
  )
  .output(
    z.object({
      timesheet: z.record(z.string(), z.any()).optional().describe('Single timesheet record'),
      timesheets: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of timesheet records'),
      totalCount: z.number().optional().describe('Total count for list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    if (ctx.input.action === 'approve') {
      let result = await client.approveTimesheet(ctx.input.timesheetId!);
      let timesheet = result?.data ?? result?.timesheet ?? result;
      return {
        output: { timesheet },
        message: `Approved timesheet **${ctx.input.timesheetId}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let result = await client.getTimesheet(ctx.input.timesheetId!);
      let timesheet = result?.data ?? result?.timesheet ?? result;
      return {
        output: { timesheet },
        message: `Retrieved timesheet **${ctx.input.timesheetId}**.`
      };
    }

    // list
    let result = await client.listTimesheets({
      employmentId: ctx.input.employmentId,
      status: ctx.input.status,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });
    let timesheets = result?.data ?? result?.timesheets ?? [];
    let totalCount = result?.total_count ?? timesheets.length;
    return {
      output: { timesheets, totalCount },
      message: `Found **${totalCount}** timesheet(s).`
    };
  });
