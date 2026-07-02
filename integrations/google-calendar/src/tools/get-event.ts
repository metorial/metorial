import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

export let getEvent = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Retrieve the full details of a specific event by its ID, including attendees, recurrence, conference data, and all metadata.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCalendarActionScopes.getEvent)
  .input(
    z.object({
      calendarId: z
        .string()
        .default('primary')
        .describe('Calendar ID. Use "primary" for the user\'s primary calendar.'),
      eventId: z.string().describe('The event ID to retrieve')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Event ID'),
      summary: z.string().optional().describe('Event title'),
      description: z.string().optional().describe('Event description'),
      location: z.string().optional().describe('Event location'),
      start: z.any().optional().describe('Event start time'),
      end: z.any().optional().describe('Event end time'),
      status: z.string().optional().describe('Event status'),
      htmlLink: z.string().optional().describe('URL to view the event'),
      hangoutLink: z.string().optional().describe('Google Meet link'),
      creator: z.any().optional().describe('Event creator'),
      organizer: z.any().optional().describe('Event organizer'),
      attendees: z.array(z.any()).optional().describe('Event attendees'),
      recurrence: z.array(z.string()).optional().describe('Recurrence rules'),
      recurringEventId: z.string().optional().describe('Parent recurring event ID'),
      visibility: z.string().optional().describe('Event visibility'),
      transparency: z.string().optional().describe('Event transparency'),
      colorId: z.string().optional().describe('Color ID'),
      reminders: z.any().optional().describe('Reminder settings'),
      conferenceData: z.any().optional().describe('Conference/meeting data'),
      created: z.string().optional().describe('Creation timestamp'),
      updated: z.string().optional().describe('Last modification timestamp'),
      iCalUID: z.string().optional().describe('iCalendar UID'),
      eventType: z
        .string()
        .optional()
        .describe('Event type (default, outOfOffice, focusTime, workingLocation)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleCalendarClient(ctx.auth.token);
    let e = await client.getEvent(ctx.input.calendarId, ctx.input.eventId);

    return {
      output: {
        eventId: e.id!,
        summary: e.summary,
        description: e.description,
        location: e.location,
        start: e.start,
        end: e.end,
        status: e.status,
        htmlLink: e.htmlLink,
        hangoutLink: e.hangoutLink,
        creator: e.creator,
        organizer: e.organizer,
        attendees: e.attendees,
        recurrence: e.recurrence,
        recurringEventId: e.recurringEventId,
        visibility: e.visibility,
        transparency: e.transparency,
        colorId: e.colorId,
        reminders: e.reminders,
        conferenceData: e.conferenceData,
        created: e.created,
        updated: e.updated,
        iCalUID: e.iCalUID,
        eventType: e.eventType
      },
      message: `Retrieved event **"${e.summary || 'Untitled'}"**${e.htmlLink ? ` ([View](${e.htmlLink}))` : ''}.`
    };
  })
  .build();
