import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { optionalString } from '../lib/output';
import { spec } from '../spec';

let attendeeSchema = z.object({
  email: z.string().describe('Email address of the attendee'),
  name: z.string().optional().describe('Display name of the attendee'),
  type: z
    .enum(['required', 'optional', 'resource'])
    .default('required')
    .describe('Attendee type')
});

let recurrencePatternSchema = z.object({
  type: z.enum([
    'daily',
    'weekly',
    'absoluteMonthly',
    'relativeMonthly',
    'absoluteYearly',
    'relativeYearly'
  ]),
  interval: z.number().describe('Interval between occurrences'),
  daysOfWeek: z
    .array(z.string())
    .optional()
    .describe('Days of week (e.g., ["monday", "wednesday"])'),
  dayOfMonth: z.number().optional(),
  month: z.number().optional(),
  firstDayOfWeek: z.string().optional(),
  index: z.string().optional()
});

let recurrenceRangeSchema = z.object({
  type: z.enum(['endDate', 'noEnd', 'numbered']),
  startDate: z.string().describe('Start date of recurrence (YYYY-MM-DD)'),
  endDate: z.string().optional().describe('End date (for endDate type)'),
  numberOfOccurrences: z
    .number()
    .optional()
    .describe('Number of occurrences (for numbered type)'),
  recurrenceTimeZone: z.string().optional()
});

export let createEvent = SlateTool.create(spec, {
  name: 'Create Calendar Event',
  key: 'create_event',
  description: `Create a new calendar event or meeting. Supports attendees, location, online meeting generation, recurrence patterns, reminders, and more. When attendees are specified, meeting invitations are automatically sent.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Title of the event'),
      bodyContent: z.string().optional().describe('Body/description of the event'),
      bodyContentType: z
        .enum(['text', 'html'])
        .default('html')
        .describe('Content type of the body'),
      startDateTime: z
        .string()
        .describe('Start date and time in ISO 8601 format (e.g., "2024-01-15T09:00:00")'),
      startTimeZone: z
        .string()
        .describe('Time zone for the start time (e.g., "Pacific Standard Time", "UTC")'),
      endDateTime: z.string().describe('End date and time in ISO 8601 format'),
      endTimeZone: z.string().describe('Time zone for the end time'),
      location: z.string().optional().describe('Display name of the location'),
      attendees: z.array(attendeeSchema).optional().describe('Event attendees'),
      isAllDay: z.boolean().optional().describe('Whether this is an all-day event'),
      isOnlineMeeting: z
        .boolean()
        .optional()
        .describe('Whether to create an online meeting (Teams)'),
      recurrencePattern: recurrencePatternSchema.optional().describe('Recurrence pattern'),
      recurrenceRange: recurrenceRangeSchema.optional().describe('Recurrence range'),
      reminderMinutesBeforeStart: z
        .number()
        .optional()
        .describe('Reminder time in minutes before the event'),
      showAs: z
        .enum(['free', 'tentative', 'busy', 'oof', 'workingElsewhere', 'unknown'])
        .optional()
        .describe('Free/busy status during the event'),
      importance: z.enum(['low', 'normal', 'high']).optional(),
      sensitivity: z.enum(['normal', 'personal', 'private', 'confidential']).optional(),
      categories: z.array(z.string()).optional(),
      calendarId: z
        .string()
        .optional()
        .describe('Calendar ID. Omit to use the default calendar.')
    })
  )
  .output(
    z.object({
      eventId: z.string(),
      subject: z.string().optional(),
      startDateTime: z.string().optional(),
      endDateTime: z.string().optional(),
      webLink: z.string().optional(),
      onlineMeetingJoinUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let recurrence =
      ctx.input.recurrencePattern && ctx.input.recurrenceRange
        ? { pattern: ctx.input.recurrencePattern, range: ctx.input.recurrenceRange }
        : undefined;

    let ev = await client.createEvent({
      subject: ctx.input.subject,
      body: ctx.input.bodyContent
        ? {
            contentType: ctx.input.bodyContentType,
            content: ctx.input.bodyContent
          }
        : undefined,
      start: {
        dateTime: ctx.input.startDateTime,
        timeZone: ctx.input.startTimeZone
      },
      end: {
        dateTime: ctx.input.endDateTime,
        timeZone: ctx.input.endTimeZone
      },
      location: ctx.input.location ? { displayName: ctx.input.location } : undefined,
      attendees: ctx.input.attendees?.map(a => ({
        emailAddress: { address: a.email, name: a.name },
        type: a.type
      })),
      isAllDay: ctx.input.isAllDay,
      isOnlineMeeting: ctx.input.isOnlineMeeting,
      onlineMeetingProvider: ctx.input.isOnlineMeeting ? 'teamsForBusiness' : undefined,
      recurrence,
      reminderMinutesBeforeStart: ctx.input.reminderMinutesBeforeStart,
      showAs: ctx.input.showAs,
      importance: ctx.input.importance,
      sensitivity: ctx.input.sensitivity,
      categories: ctx.input.categories,
      calendarId: ctx.input.calendarId
    });

    return {
      output: {
        eventId: ev.id,
        subject: ev.subject,
        startDateTime: ev.start?.dateTime,
        endDateTime: ev.end?.dateTime,
        webLink: ev.webLink,
        onlineMeetingJoinUrl: optionalString(ev.onlineMeeting?.joinUrl || ev.onlineMeetingUrl)
      },
      message: `Created event **"${ev.subject}"** from ${ev.start?.dateTime} to ${ev.end?.dateTime}.${ev.onlineMeeting?.joinUrl ? ` Online meeting: ${ev.onlineMeeting.joinUrl}` : ''}`
    };
  })
  .build();
