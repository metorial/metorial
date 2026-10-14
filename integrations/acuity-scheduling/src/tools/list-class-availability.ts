import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

type ClassAvailability = {
  appointmentTypeID: number;
  calendarID: number;
  name: string;
  time: string;
  calendar: string;
  duration: number | string;
  isSeries: boolean;
  slots: number;
  slotsAvailable: number;
};

export let listClassAvailability = SlateTool.create(spec, {
  name: 'List Class Availability',
  key: 'list_class_availability',
  description:
    'List group class sessions and remaining seats. Filter by month or date range, appointment type, and calendar. Use the returned time, appointment type ID, and calendar ID to book a class.',
  instructions: ['When month is supplied, it takes precedence over minDate and maxDate.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      month: z.string().optional().describe('Month to check, such as 2026-10'),
      minDate: z.string().optional().describe('Earliest date when month is omitted'),
      maxDate: z.string().optional().describe('Latest date when month is omitted'),
      appointmentTypeId: z
        .number()
        .optional()
        .describe('Class appointment type ID from list_appointment_types'),
      calendarId: z.number().optional().describe('Calendar ID from list_calendars'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for returned class times, such as America/New_York'),
      includeUnavailable: z
        .boolean()
        .optional()
        .describe('Include full or otherwise unavailable classes'),
      includePrivate: z.boolean().optional().describe('Include private classes')
    })
  )
  .output(
    z.object({
      classes: z.array(
        z.object({
          appointmentTypeId: z.number().describe('Appointment type ID for booking'),
          calendarId: z.number().describe('Calendar ID for booking'),
          name: z.string().describe('Class name'),
          time: z.string().describe('Class session date and time'),
          calendar: z.string().describe('Calendar name'),
          duration: z.string().describe('Class duration in minutes'),
          isSeries: z
            .boolean()
            .describe('Whether clients should book every session in a series'),
          slots: z.number().describe('Maximum number of attendees'),
          slotsAvailable: z.number().describe('Remaining available seats')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let results: ClassAvailability[] = await client.getClassAvailability({
      month: ctx.input.month,
      minDate: ctx.input.minDate,
      maxDate: ctx.input.maxDate,
      appointmentTypeID: ctx.input.appointmentTypeId,
      calendarID: ctx.input.calendarId,
      timezone: ctx.input.timezone,
      includeUnavailable: ctx.input.includeUnavailable,
      includePrivate: ctx.input.includePrivate
    });
    let classes = results.map(session => ({
      appointmentTypeId: session.appointmentTypeID,
      calendarId: session.calendarID,
      name: session.name,
      time: session.time,
      calendar: session.calendar,
      duration: String(session.duration),
      isSeries: session.isSeries,
      slots: session.slots,
      slotsAvailable: session.slotsAvailable
    }));
    return {
      output: { classes },
      message: `Found **${classes.length}** class session(s).`
    };
  })
  .build();
