import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List events from a Google Calendar with flexible filtering options. Supports time range filtering, text search, pagination, and sorting.
Use **"primary"** as the calendarId to list events from the user's primary calendar.`,
  instructions: [
    'Set singleEvents to true and orderBy to "startTime" to get a flat, chronologically sorted list (expands recurring events into individual instances).',
    'Without singleEvents=true, recurring events appear as a single entry with recurrence rules.',
    'Use timeMin/timeMax in RFC3339 format (e.g. "2024-01-01T00:00:00Z").'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleCalendarActionScopes.listEvents)
  .input(
    z.object({
      calendarId: z
        .string()
        .default('primary')
        .describe('Calendar ID. Use "primary" for the user\'s primary calendar.'),
      timeMin: z
        .string()
        .optional()
        .describe('Lower bound (inclusive) for event start time, RFC3339 format'),
      timeMax: z
        .string()
        .optional()
        .describe('Upper bound (exclusive) for event start time, RFC3339 format'),
      q: z
        .string()
        .optional()
        .describe(
          'Free text search terms to find events matching summary, description, location, etc.'
        ),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of events to return (default 250, max 2500)'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results'),
      singleEvents: z
        .boolean()
        .optional()
        .describe(
          'If true, expands recurring events into individual instances. Required when using orderBy="startTime".'
        ),
      orderBy: z
        .enum(['startTime', 'updated'])
        .optional()
        .describe('Sort order. "startTime" requires singleEvents=true.'),
      timeZone: z
        .string()
        .optional()
        .describe('IANA time zone for the response (e.g. "America/New_York")')
    })
  )
  .output(
    z.object({
      events: z
        .array(
          z.object({
            eventId: z.string().optional().describe('Event ID'),
            summary: z.string().optional().describe('Event title'),
            description: z.string().optional().describe('Event description'),
            location: z.string().optional().describe('Event location'),
            start: z.any().optional().describe('Event start time'),
            end: z.any().optional().describe('Event end time'),
            status: z
              .string()
              .optional()
              .describe('Event status (confirmed, tentative, cancelled)'),
            htmlLink: z.string().optional().describe('URL to view the event'),
            hangoutLink: z.string().optional().describe('Google Meet link'),
            creator: z.any().optional().describe('Event creator'),
            organizer: z.any().optional().describe('Event organizer'),
            attendees: z.array(z.any()).optional().describe('Event attendees'),
            recurrence: z.array(z.string()).optional().describe('Recurrence rules'),
            recurringEventId: z
              .string()
              .optional()
              .describe('ID of the parent recurring event'),
            created: z.string().optional().describe('Creation timestamp'),
            updated: z.string().optional().describe('Last modification timestamp')
          })
        )
        .describe('List of events'),
      nextPageToken: z.string().optional().describe('Token for fetching the next page'),
      totalResults: z.number().describe('Number of events returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleCalendarClient(ctx.auth.token);

    let result = await client.listEvents({
      calendarId: ctx.input.calendarId,
      timeMin: ctx.input.timeMin,
      timeMax: ctx.input.timeMax,
      q: ctx.input.q,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken,
      singleEvents: ctx.input.singleEvents,
      orderBy: ctx.input.orderBy,
      timeZone: ctx.input.timeZone
    });

    let events = (result.items || []).map(e => ({
      eventId: e.id,
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
      created: e.created,
      updated: e.updated
    }));

    return {
      output: {
        events,
        nextPageToken: result.nextPageToken,
        totalResults: events.length
      },
      message: `Found **${events.length}** event(s)${result.nextPageToken ? ' (more pages available)' : ''}.`
    };
  })
  .build();
