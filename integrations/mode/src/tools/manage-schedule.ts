import { SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { getEmbedded, normalizeSchedule } from '../lib/helpers';
import { spec } from '../spec';

let scheduleSchema = z.object({
  scheduleToken: z.string().describe('Unique token of the schedule'),
  name: z.string().describe('Name of the schedule'),
  frequency: z.string().describe('Schedule frequency (hourly, daily, weekly, monthly)'),
  hour: z.number().nullable().describe('Hour of the day (0-23)'),
  minute: z.number().nullable().describe('Minute of the hour (0-59)'),
  dayOfWeek: z.number().nullable().describe('Day of the week (0=Sunday, 6=Saturday)'),
  dayOfMonth: z.number().nullable().describe('Day of the month (1-31)'),
  timeZone: z.string().describe('Time zone for the schedule'),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let listReportSchedules = SlateTool.create(spec, {
  name: 'List Report Schedules',
  key: 'list_report_schedules',
  description: `List all scheduled runs configured for a specific Mode report. Returns schedule details including frequency, time, and timezone.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportToken: z.string().describe('Token of the report')
    })
  )
  .output(
    z.object({
      schedules: z.array(scheduleSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ModeClient({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      workspaceName: ctx.config.workspaceName
    });

    let data = await client.listReportSchedules(ctx.input.reportToken);
    let schedules = getEmbedded(data, 'report_schedules').map(normalizeSchedule);

    return {
      output: { schedules },
      message: `Found **${schedules.length}** schedules for the report.`
    };
  })
  .build();

export let manageReportSchedule = SlateTool.create(spec, {
  name: 'Manage Report Schedule',
  key: 'manage_report_schedule',
  description: `Create, update, or delete a schedule for a Mode report.
Use **create** to set up a recurring schedule with configurable frequency, time, and timezone.
Use **update** to modify an existing schedule's parameters.
Use **delete** to remove a schedule.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      reportToken: z.string().describe('Token of the report'),
      scheduleToken: z
        .string()
        .optional()
        .describe('Token of the schedule (required for update/delete)'),
      name: z.string().optional().describe('Name of the schedule'),
      frequency: z.string().optional().describe('Frequency: hourly, daily, weekly, monthly'),
      hour: z.number().optional().describe('Hour (0-23)'),
      minute: z.number().optional().describe('Minute (0-59)'),
      dayOfWeek: z
        .number()
        .optional()
        .describe('Day of week (0=Sunday, 6=Saturday) for weekly schedules'),
      dayOfMonth: z.number().optional().describe('Day of month (1-31) for monthly schedules'),
      timeZone: z.string().optional().describe('Time zone, e.g. "US/Eastern"'),
      params: z
        .record(z.string(), z.any())
        .optional()
        .describe('Parameters to pass to the scheduled report run'),
      timeout: z.number().optional().describe('Timeout in seconds for the scheduled run')
    })
  )
  .output(scheduleSchema)
  .handleInvocation(async ctx => {
    let client = new ModeClient({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      workspaceName: ctx.config.workspaceName
    });

    let { action, reportToken } = ctx.input;
    let scheduleData = {
      name: ctx.input.name,
      frequency: ctx.input.frequency,
      hour: ctx.input.hour,
      minute: ctx.input.minute,
      dayOfWeek: ctx.input.dayOfWeek,
      dayOfMonth: ctx.input.dayOfMonth,
      timeZone: ctx.input.timeZone,
      params: ctx.input.params,
      timeout: ctx.input.timeout
    };

    if (action === 'create') {
      let raw = await client.createReportSchedule(reportToken, scheduleData);
      let schedule = normalizeSchedule(raw);
      return {
        output: schedule,
        message: `Created schedule **${schedule.name || schedule.scheduleToken}** (${schedule.frequency}).`
      };
    }

    if (action === 'update') {
      let raw = await client.updateReportSchedule(
        reportToken,
        ctx.input.scheduleToken!,
        scheduleData
      );
      let schedule = normalizeSchedule(raw);
      return {
        output: schedule,
        message: `Updated schedule **${schedule.name || schedule.scheduleToken}**.`
      };
    }

    // delete
    let existing = await client.getReportSchedule(reportToken, ctx.input.scheduleToken!);
    let schedule = normalizeSchedule(existing);
    await client.deleteReportSchedule(reportToken, ctx.input.scheduleToken!);
    return {
      output: schedule,
      message: `Deleted schedule **${schedule.name || schedule.scheduleToken}**.`
    };
  })
  .build();
