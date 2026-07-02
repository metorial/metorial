import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

let eventDateTimeSchema = z
  .object({
    dateTime: z
      .string()
      .optional()
      .describe('RFC3339 timestamp (e.g. "2024-01-15T09:00:00-05:00"). Use for timed events.'),
    date: z
      .string()
      .optional()
      .describe('Date in YYYY-MM-DD format. Use for all-day events instead of dateTime.'),
    timeZone: z
      .string()
      .optional()
      .describe(
        'IANA time zone (e.g. "America/New_York"). Defaults to the calendar\'s time zone.'
      )
  })
  .describe(
    'Event start/end time. Provide either dateTime (timed events) or date (all-day events).'
  );

let attendeeSchema = z.object({
  email: z.string().describe('Email address of the attendee'),
  displayName: z.string().optional().describe('Display name of the attendee'),
  optional: z.boolean().optional().describe('Whether the attendee is optional'),
  comment: z.string().optional().describe('Comment from the attendee')
});

let reminderOverrideSchema = z.object({
  method: z.enum(['email', 'popup']).describe('Reminder method'),
  minutes: z.number().describe('Minutes before the event to trigger the reminder')
});

export let createEvent = SlateTool.create(spec, {
  name: 'Create Event',
  key: 'create_event',
  description: `Create a new event on a Google Calendar. Supports timed events, all-day events, recurring events, attendees, conferencing (Google Meet), reminders, and more.
Use **"primary"** as the calendarId to create events on the user's primary calendar.`,
  instructions: [
    'For all-day events, use "date" in start/end instead of "dateTime".',
    'To create a Google Meet link, set addGoogleMeet to true.',
    'For recurring events, provide recurrence rules in RRULE format (e.g. ["RRULE:FREQ=WEEKLY;COUNT=10"]).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleCalendarActionScopes.createEvent)
  .input(
    z.object({
      calendarId: z
        .string()
        .default('primary')
        .describe('Calendar ID. Use "primary" for the user\'s primary calendar.'),
      summary: z.string().describe('Title of the event'),
      description: z
        .string()
        .optional()
        .describe('Description or notes for the event (supports HTML)'),
      location: z
        .string()
        .optional()
        .describe('Geographic location of the event as free-form text'),
      start: eventDateTimeSchema.describe('Start time of the event'),
      end: eventDateTimeSchema.describe('End time of the event'),
      attendees: z.array(attendeeSchema).optional().describe('List of attendees to invite'),
      recurrence: z
        .array(z.string())
        .optional()
        .describe('Recurrence rules in RRULE format (e.g. ["RRULE:FREQ=WEEKLY;COUNT=10"])'),
      reminders: z
        .object({
          useDefault: z.boolean().describe("Whether to use the calendar's default reminders"),
          overrides: z
            .array(reminderOverrideSchema)
            .optional()
            .describe('Custom reminder overrides')
        })
        .optional()
        .describe('Reminder settings for the event'),
      colorId: z
        .string()
        .optional()
        .describe('Color ID for the event (use get_colors tool to see available IDs)'),
      visibility: z
        .enum(['default', 'public', 'private', 'confidential'])
        .optional()
        .describe('Visibility of the event'),
      transparency: z
        .enum(['opaque', 'transparent'])
        .optional()
        .describe('"opaque" means busy, "transparent" means available'),
      guestsCanModify: z.boolean().optional().describe('Whether guests can modify the event'),
      guestsCanInviteOthers: z
        .boolean()
        .optional()
        .describe('Whether guests can invite other guests'),
      guestsCanSeeOtherGuests: z
        .boolean()
        .optional()
        .describe('Whether guests can see other guests'),
      addGoogleMeet: z
        .boolean()
        .optional()
        .describe('If true, automatically creates a Google Meet conference link'),
      sendUpdates: z
        .enum(['all', 'externalOnly', 'none'])
        .optional()
        .describe('Whether to send notifications to attendees. Defaults to none.')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('ID of the created event'),
      summary: z.string().optional().describe('Title of the event'),
      htmlLink: z.string().optional().describe('URL to view the event in Google Calendar'),
      hangoutLink: z
        .string()
        .optional()
        .describe('Google Meet link if conference was created'),
      start: z.any().optional().describe('Start time of the event'),
      end: z.any().optional().describe('End time of the event'),
      status: z.string().optional().describe('Status of the event'),
      created: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleCalendarClient(ctx.auth.token);

    let eventBody: any = {
      summary: ctx.input.summary,
      description: ctx.input.description,
      location: ctx.input.location,
      start: ctx.input.start,
      end: ctx.input.end,
      attendees: ctx.input.attendees,
      recurrence: ctx.input.recurrence,
      reminders: ctx.input.reminders,
      colorId: ctx.input.colorId,
      visibility: ctx.input.visibility,
      transparency: ctx.input.transparency,
      guestsCanModify: ctx.input.guestsCanModify,
      guestsCanInviteOthers: ctx.input.guestsCanInviteOthers,
      guestsCanSeeOtherGuests: ctx.input.guestsCanSeeOtherGuests
    };

    let conferenceDataVersion: number | undefined;
    if (ctx.input.addGoogleMeet) {
      eventBody.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      };
      conferenceDataVersion = 1;
    }

    let event = await client.createEvent(ctx.input.calendarId, eventBody, {
      sendUpdates: ctx.input.sendUpdates || 'none',
      conferenceDataVersion
    });

    return {
      output: {
        eventId: event.id!,
        summary: event.summary,
        htmlLink: event.htmlLink,
        hangoutLink: event.hangoutLink,
        start: event.start,
        end: event.end,
        status: event.status,
        created: event.created
      },
      message: `Created event **"${event.summary}"** ([View in Calendar](${event.htmlLink}))${event.hangoutLink ? ` with [Google Meet link](${event.hangoutLink})` : ''}.`
    };
  })
  .build();
