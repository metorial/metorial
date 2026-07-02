import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAppointmentsTool = SlateTool.create(spec, {
  name: 'Manage Appointments',
  key: 'manage_appointments',
  description: `View calendars, list appointments, or manage initial appointments for jobs. List available calendars, retrieve appointment summaries within a date range, or create/update the initial appointment for a specific job.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      calendarId: z.string().optional().describe('Calendar ID to list appointments from'),
      appointmentId: z
        .string()
        .optional()
        .describe('Specific appointment ID to get details (requires calendarId)'),
      jobId: z.string().optional().describe('Job ID to get or set the initial appointment'),
      startDate: z
        .string()
        .optional()
        .describe(
          'Start date for appointment listing in YYYY-MM-DD format (requires calendarId)'
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          'End date for appointment listing in YYYY-MM-DD format (requires calendarId)'
        ),
      startDateTime: z
        .string()
        .optional()
        .describe(
          'Start date/time for initial appointment (ISO 8601 format, for creating/updating)'
        ),
      endDateTime: z
        .string()
        .optional()
        .describe(
          'End date/time for initial appointment (ISO 8601 format, for creating/updating)'
        ),
      appointmentCalendarId: z
        .string()
        .optional()
        .describe('Calendar to assign the initial appointment to'),
      appointmentDescription: z
        .string()
        .optional()
        .describe('Description for the initial appointment'),
      pageSize: z.number().optional().describe('Number of items per page'),
      pageStartIndex: z.number().optional().describe('Index of the first element to return')
    })
  )
  .output(
    z.object({
      calendars: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Available calendars'),
      appointments: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Appointment list'),
      appointment: z.record(z.string(), z.any()).optional().describe('Appointment details'),
      initialAppointment: z
        .record(z.string(), z.any())
        .optional()
        .describe('Initial appointment for a job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    // Update/create initial appointment for a job
    if (ctx.input.jobId && (ctx.input.startDateTime || ctx.input.endDateTime)) {
      let initialAppointment = await client.setJobInitialAppointment(ctx.input.jobId, {
        startDateTime: ctx.input.startDateTime,
        endDateTime: ctx.input.endDateTime,
        calendarId: ctx.input.appointmentCalendarId,
        description: ctx.input.appointmentDescription
      });
      return {
        output: { initialAppointment },
        message: `Updated initial appointment for job **${ctx.input.jobId}**.`
      };
    }

    // Get initial appointment for a job
    if (ctx.input.jobId) {
      let initialAppointment = await client.getJobInitialAppointment(ctx.input.jobId);
      return {
        output: { initialAppointment },
        message: `Retrieved initial appointment for job **${ctx.input.jobId}**.`
      };
    }

    // Get specific appointment details
    if (ctx.input.calendarId && ctx.input.appointmentId) {
      let appointment = await client.getAppointment(
        ctx.input.calendarId,
        ctx.input.appointmentId
      );
      return {
        output: { appointment },
        message: `Retrieved appointment **${ctx.input.appointmentId}**.`
      };
    }

    // List appointments for a calendar
    if (ctx.input.calendarId) {
      let result = await client.getAppointments(ctx.input.calendarId, {
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        pageSize: ctx.input.pageSize,
        pageStartIndex: ctx.input.pageStartIndex
      });
      let appointments = Array.isArray(result)
        ? result
        : (result?.items ?? result?.data ?? []);
      return {
        output: { appointments },
        message: `Retrieved **${appointments.length}** appointment(s) from calendar **${ctx.input.calendarId}**.`
      };
    }

    // Default: list calendars
    let result = await client.getCalendars();
    let calendars = Array.isArray(result)
      ? result
      : (result?.items ?? result?.data ?? [result]);
    return {
      output: { calendars },
      message: `Retrieved **${calendars.length}** calendar(s).`
    };
  })
  .build();
