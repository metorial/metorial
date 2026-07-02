import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTimeOff = SlateTool.create(spec, {
  name: 'Manage Time Off',
  key: 'manage_time_off',
  description: `Create, approve, decline, or cancel time off requests. Also supports listing time off records with filters and retrieving leave policy summaries for an employee.`,
  instructions: [
    'Use action "create" to submit a new time off request.',
    'Use action "approve", "decline", or "cancel" to act on an existing time off by providing timeoffId.',
    'Use action "list" to browse time off records with optional filters.',
    'Use action "get_leave_policies" to see available leave types and balances for an employee.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'approve', 'decline', 'cancel', 'list', 'get_leave_policies'])
        .describe('Action to perform'),
      timeoffId: z
        .string()
        .optional()
        .describe('Time off ID (required for approve, decline, cancel)'),
      employmentId: z
        .string()
        .optional()
        .describe('Employment ID (required for create, list, get_leave_policies)'),
      timeoffType: z
        .string()
        .optional()
        .describe('Type of time off (e.g., sick_leave, vacation) for create action'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD) for create action'),
      endDate: z.string().optional().describe('End date (YYYY-MM-DD) for create action'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone (e.g., Europe/London) for create action'),
      notes: z.string().optional().describe('Optional notes for create or decline actions'),
      startDateIsHalfDay: z.boolean().optional().describe('Whether start date is a half day'),
      endDateIsHalfDay: z.boolean().optional().describe('Whether end date is a half day'),
      status: z.string().optional().describe('Filter by status when listing'),
      page: z.number().optional().describe('Page number for list action'),
      pageSize: z.number().optional().describe('Page size for list action')
    })
  )
  .output(
    z.object({
      timeoff: z
        .record(z.string(), z.any())
        .optional()
        .describe('Time off record (for create, approve, decline, cancel, get)'),
      timeoffs: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of time off records (for list action)'),
      leavePolicies: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Leave policy summaries (for get_leave_policies action)'),
      totalCount: z.number().optional().describe('Total count of records (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    if (ctx.input.action === 'create') {
      let result = await client.createTimeOff({
        employmentId: ctx.input.employmentId!,
        timeoffType: ctx.input.timeoffType!,
        startDate: ctx.input.startDate!,
        endDate: ctx.input.endDate!,
        timezone: ctx.input.timezone!,
        notes: ctx.input.notes,
        startDateIsHalfDay: ctx.input.startDateIsHalfDay,
        endDateIsHalfDay: ctx.input.endDateIsHalfDay
      });
      let timeoff = result?.data ?? result?.timeoff ?? result;
      return {
        output: { timeoff },
        message: `Created time off request from **${ctx.input.startDate}** to **${ctx.input.endDate}**.`
      };
    }

    if (ctx.input.action === 'approve') {
      let result = await client.approveTimeOff(ctx.input.timeoffId!);
      let timeoff = result?.data ?? result?.timeoff ?? result;
      return {
        output: { timeoff },
        message: `Approved time off **${ctx.input.timeoffId}**.`
      };
    }

    if (ctx.input.action === 'decline') {
      let result = await client.declineTimeOff(ctx.input.timeoffId!, ctx.input.notes);
      let timeoff = result?.data ?? result?.timeoff ?? result;
      return {
        output: { timeoff },
        message: `Declined time off **${ctx.input.timeoffId}**.`
      };
    }

    if (ctx.input.action === 'cancel') {
      let result = await client.cancelTimeOff(ctx.input.timeoffId!);
      let timeoff = result?.data ?? result?.timeoff ?? result;
      return {
        output: { timeoff },
        message: `Cancelled time off **${ctx.input.timeoffId}**.`
      };
    }

    if (ctx.input.action === 'get_leave_policies') {
      let result = await client.listLeavePoliciesSummary(ctx.input.employmentId!);
      let leavePolicies = result?.data ?? result?.leave_policies ?? [];
      return {
        output: { leavePolicies },
        message: `Retrieved **${leavePolicies.length}** leave policy/policies for employment **${ctx.input.employmentId}**.`
      };
    }

    // list
    let result = await client.listTimeOff({
      employmentId: ctx.input.employmentId,
      status: ctx.input.status,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });
    let timeoffs = result?.data ?? result?.timeoffs ?? [];
    let totalCount = result?.total_count ?? timeoffs.length;
    return {
      output: { timeoffs, totalCount },
      message: `Found **${totalCount}** time off record(s).`
    };
  });
