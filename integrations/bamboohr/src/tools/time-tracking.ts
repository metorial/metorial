import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { invalid, responseId, unexpected } from '../lib/contracts';
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
      start: z
        .string()
        .describe(
          'Start date in YYYY-MM-DD format, within the last 365 days in the company timezone'
        ),
      end: z
        .string()
        .describe(
          'End date in YYYY-MM-DD format, within the last 365 days in the company timezone'
        ),
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
    let client = clientFor(ctx);

    let employeeIdsStr = ctx.input.employeeIds?.join(',');

    const entries = await client.getTimesheetEntries({
      start: ctx.input.start,
      end: ctx.input.end,
      employeeIds: employeeIdsStr
    });
    for (const entry of entries)
      if (entry.start !== null && typeof entry.start !== 'string') unexpected();
    const timesheetEntries = entries.filter(entry => entry.start === null);
    const clockEntries = entries.filter(entry => typeof entry.start === 'string');

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
        .describe(
          'Optional historical clock-in ISO timestamp with timezone. Omit for current server time; when supplied, timezone is also required.'
        ),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for the entry (e.g., "America/New_York")'),
      note: z
        .string()
        .optional()
        .describe('Optional clock-in note; unsupported for clock_out'),
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
      action: z.string().describe('The action performed'),
      entryId: z.string().optional().describe('Provider-assigned clock entry ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let result: Record<string, unknown>;
    if (ctx.input.action === 'clock_in') {
      result = await client.clockIn(ctx.input.employeeId, {
        start: ctx.input.start,
        timezone: ctx.input.timezone,
        note: ctx.input.note,
        projectId: ctx.input.projectId,
        taskId: ctx.input.taskId
      });
    } else {
      if (
        ctx.input.start !== undefined ||
        ctx.input.projectId !== undefined ||
        ctx.input.taskId !== undefined
      )
        invalid('clock_out does not accept start, projectId or taskId.');
      result = await client.clockOut(ctx.input.employeeId, {
        timezone: ctx.input.timezone,
        note: ctx.input.note
      });
    }

    return {
      output: {
        employeeId: ctx.input.employeeId,
        action: ctx.input.action,
        entryId: responseId(result.id)
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
      hours: z.number().describe('Hours logged'),
      entryId: z.string().optional().describe('Provider-assigned hour entry ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    const result = await client.addTimesheetEntry(ctx.input.employeeId, {
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
        hours: ctx.input.hours,
        entryId: responseId(result.id)
      },
      message: `Added **${ctx.input.hours}** hours for employee **${ctx.input.employeeId}** on ${ctx.input.date}.`
    };
  })
  .build();
