import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

export let manageTimeClock = SlateTool.create(spec, {
  name: 'Manage Time Clock',
  key: 'manage_time_clock',
  description: `Perform time clock operations: clock in/out a user, list time clocks, retrieve time activities, or get timesheet totals. Use this to manage employee work hours and track attendance.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_time_clocks',
          'get_time_activities',
          'get_timesheet_totals',
          'clock_in',
          'clock_out'
        ])
        .describe('Time clock action to perform'),
      timeClockId: z
        .string()
        .optional()
        .describe('Time clock ID (required for all actions except list_time_clocks)'),
      userId: z.number().optional().describe('User ID (required for clock_in and clock_out)'),
      jobId: z.string().optional().describe('Job ID to associate with clock in'),
      startDate: z
        .string()
        .optional()
        .describe('Start date filter (YYYY-MM-DD) for time activities and timesheet'),
      endDate: z
        .string()
        .optional()
        .describe('End date filter (YYYY-MM-DD) for time activities and timesheet'),
      userIds: z.array(z.number()).optional().describe('Filter timesheet by user IDs'),
      limit: z.number().optional().describe('Results per page'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      result: z.any().describe('API response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      ...ctx.auth,
      baseUrl: ctx.auth.baseUrl ?? (ctx.config as { baseUrl?: string }).baseUrl
    });

    let { action, timeClockId } = ctx.input;

    if (action === 'list_time_clocks') {
      let result = await client.getTimeClocks();
      return {
        output: { result },
        message: `Retrieved time clocks.`
      };
    }

    if (!timeClockId) {
      throw createApiServiceError('timeClockId is required for this action.');
    }
    if (
      (action === 'get_time_activities' || action === 'get_timesheet_totals') &&
      (!ctx.input.startDate || !ctx.input.endDate)
    ) {
      throw createApiServiceError('startDate and endDate are required for this action.');
    }

    if (action === 'get_time_activities') {
      let result = await client.getTimeActivities(timeClockId, {
        startDate: ctx.input.startDate!,
        endDate: ctx.input.endDate!,
        userIds: ctx.input.userIds
      });
      return {
        output: { result },
        message: `Retrieved time activities for time clock **${timeClockId}**.`
      };
    }

    if (action === 'get_timesheet_totals') {
      let result = await client.getTimesheetTotals(timeClockId, {
        startDate: ctx.input.startDate!,
        endDate: ctx.input.endDate!,
        userIds: ctx.input.userIds
      });
      return {
        output: { result },
        message: `Retrieved timesheet totals for time clock **${timeClockId}**.`
      };
    }

    if (action === 'clock_in') {
      if (!ctx.input.userId) throw createApiServiceError('userId is required for clock_in.');
      let body: any = { userId: ctx.input.userId };
      if (ctx.input.jobId) body.jobId = ctx.input.jobId;
      let result = await client.clockIn(timeClockId, body);
      return {
        output: { result },
        message: `Clocked in user **${ctx.input.userId}** on time clock **${timeClockId}**.`
      };
    }

    if (action === 'clock_out') {
      if (!ctx.input.userId) throw createApiServiceError('userId is required for clock_out.');
      let result = await client.clockOut(timeClockId, { userId: ctx.input.userId });
      return {
        output: { result },
        message: `Clocked out user **${ctx.input.userId}** on time clock **${timeClockId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
