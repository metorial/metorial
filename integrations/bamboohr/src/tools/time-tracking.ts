import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTimesheetEntries = SlateTool.create(spec, {
  name: 'Get Timesheet Entries',
  key: 'get_timesheet_entries',
  description: `Retrieve timesheet entries and clock entries for a date range. Optionally filter by specific employee IDs. Returns both timesheet hour entries and clock-in/clock-out entries.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      start: z.string().describe('Start date in YYYY-MM-DD format'),
      end: z.string().describe('End date in YYYY-MM-DD format'),
      employeeIds: z
        .array(z.string())
        .optional()
        .describe('Specific employee IDs to filter by')
    })
  )
  .output(
    z.object({
      timesheetEntries: z
        .array(z.record(z.string(), z.any()))
        .describe('Timesheet hour entries'),
      clockEntries: z
        .array(z.record(z.string(), z.any()))
        .describe('Clock-in/clock-out entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let employeeIdsStr = ctx.input.employeeIds?.join(',');

    let [timesheetData, clockData] = await Promise.all([
      client.getTimesheetEntries({
        start: ctx.input.start,
        end: ctx.input.end,
        employeeIds: employeeIdsStr
      }),
      client.getClockEntries({
        start: ctx.input.start,
        end: ctx.input.end,
        employeeIds: employeeIdsStr
      })
    ]);

    let timesheetEntries = Array.isArray(timesheetData) ? timesheetData : [];
    let clockEntries = Array.isArray(clockData) ? clockData : [];

    return {
      output: {
        timesheetEntries,
        clockEntries
      },
      message: `Found **${timesheetEntries.length}** timesheet entries and **${clockEntries.length}** clock entries from ${ctx.input.start} to ${ctx.input.end}.`
    };
  })
  .build();

export let clockInOut = SlateTool.create(spec, {
  name: 'Clock In/Out',
  key: 'clock_in_out',
  description: `Clock an employee in or out for time tracking. Supports adding notes and associating the entry with a project or task.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      action: z.enum(['clock_in', 'clock_out']).describe('Whether to clock in or clock out'),
      start: z
        .string()
        .optional()
        .describe('Start time in ISO 8601 format (required for clock_in)'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for the entry (e.g., "America/New_York")'),
      note: z.string().optional().describe('Optional note for the clock entry'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID to associate with (clock_in only)'),
      taskId: z.string().optional().describe('Task ID to associate with (clock_in only)')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      action: z.string().describe('The action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    if (ctx.input.action === 'clock_in') {
      if (!ctx.input.start) {
        throw new Error('Start time is required for clock_in action.');
      }
      await client.clockIn(ctx.input.employeeId, {
        start: ctx.input.start,
        timezone: ctx.input.timezone,
        note: ctx.input.note,
        projectId: ctx.input.projectId,
        taskId: ctx.input.taskId
      });
    } else {
      await client.clockOut(ctx.input.employeeId, {
        timezone: ctx.input.timezone,
        note: ctx.input.note
      });
    }

    return {
      output: {
        employeeId: ctx.input.employeeId,
        action: ctx.input.action
      },
      message: `Employee **${ctx.input.employeeId}** has been ${ctx.input.action === 'clock_in' ? 'clocked in' : 'clocked out'}.`
    };
  })
  .build();

export let addTimesheetEntry = SlateTool.create(spec, {
  name: 'Add Timesheet Entry',
  key: 'add_timesheet_entry',
  description: `Add a timesheet hour entry for an employee on a specific date. Can include hours worked, a note, and optionally associate with a project or task.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      date: z.string().describe('Date for the entry in YYYY-MM-DD format'),
      hours: z.number().describe('Number of hours worked'),
      note: z.string().optional().describe('Optional note for the entry'),
      projectId: z.string().optional().describe('Project ID to associate with'),
      taskId: z.string().optional().describe('Task ID to associate with')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      date: z.string().describe('The date of the entry'),
      hours: z.number().describe('Hours logged')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    await client.addTimesheetEntry(ctx.input.employeeId, {
      date: ctx.input.date,
      hours: ctx.input.hours,
      note: ctx.input.note,
      projectId: ctx.input.projectId,
      taskId: ctx.input.taskId
    });

    return {
      output: {
        employeeId: ctx.input.employeeId,
        date: ctx.input.date,
        hours: ctx.input.hours
      },
      message: `Added **${ctx.input.hours}** hours for employee **${ctx.input.employeeId}** on ${ctx.input.date}.`
    };
  })
  .build();
