import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkAvailability = SlateTool.create(spec, {
  name: 'Check Availability',
  key: 'check_availability',
  description: `Check available dates for a given month or available time slots for a specific date. Provide a **month** to get available dates, or a **date** to get specific time slots. Both require an appointment type ID.`,
  instructions: [
    'To find available time slots, first query available dates for a month, then query times for a specific date.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appointmentTypeId: z.number().describe('Appointment type ID to check availability for'),
      month: z
        .string()
        .optional()
        .describe(
          'Month to check for available dates (e.g. "2024-03"). Returns available dates.'
        ),
      date: z
        .string()
        .optional()
        .describe(
          'Specific date to check for available time slots (e.g. "2024-03-15"). Returns available times.'
        ),
      calendarId: z.number().optional().describe('Filter by specific calendar ID'),
      addonIds: z
        .array(z.number())
        .optional()
        .describe('Add-on IDs to include when calculating availability'),
      ignoreAppointmentIds: z
        .array(z.number())
        .optional()
        .describe(
          'Appointment IDs to ignore when checking times, allowing overlapping rescheduling; used with date'
        ),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for time conversion (IANA format, e.g. "America/New_York")')
    })
  )
  .output(
    z.object({
      availableDates: z
        .array(z.string())
        .optional()
        .describe('List of available dates (when querying by month)'),
      availableTimes: z
        .array(z.string())
        .optional()
        .describe('List of available time slots (when querying by date)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    if (Boolean(ctx.input.date) === Boolean(ctx.input.month)) {
      throw createApiServiceError(
        'Provide exactly one of month or date to check availability.'
      );
    }
    if (ctx.input.ignoreAppointmentIds?.length && !ctx.input.date) {
      throw createApiServiceError(
        'ignoreAppointmentIds is supported only when checking times with date.'
      );
    }

    if (ctx.input.date) {
      let times = await client.getAvailableTimes({
        appointmentTypeID: ctx.input.appointmentTypeId,
        date: ctx.input.date,
        calendarID: ctx.input.calendarId,
        timezone: ctx.input.timezone,
        addonIDs: ctx.input.addonIds,
        ignoreAppointmentIDs: ctx.input.ignoreAppointmentIds
      });

      let availableTimes = (times as any[]).map((t: any) => t.time);

      return {
        output: { availableTimes },
        message: `Found **${availableTimes.length}** available time slot(s) on **${ctx.input.date}**.`
      };
    }

    if (ctx.input.month) {
      let dates = await client.getAvailableDates({
        appointmentTypeID: ctx.input.appointmentTypeId,
        month: ctx.input.month,
        calendarID: ctx.input.calendarId,
        timezone: ctx.input.timezone,
        addonIDs: ctx.input.addonIds
      });

      let availableDates = (dates as any[]).map((d: any) => d.date);

      return {
        output: { availableDates },
        message: `Found **${availableDates.length}** available date(s) in **${ctx.input.month}**.`
      };
    }

    throw createApiServiceError('Provide month or date to check availability.');
  })
  .build();
