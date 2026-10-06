import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nextCursor } from '../lib/client';
import { spec } from '../spec';

let calendarEventSchema = z.object({
  eventId: z.string().describe('Calendar event unique identifier'),
  calendarId: z.string().describe('ID of the calendar this event belongs to'),
  meetingUrl: z.string().nullable().describe('Meeting URL extracted from the event'),
  meetingPlatform: z
    .string()
    .nullable()
    .describe('Detected meeting platform (zoom, google_meet, teams, etc.)'),
  startTime: z.string().describe('Event start time (ISO 8601)'),
  endTime: z.string().describe('Event end time (ISO 8601)'),
  title: z.string().nullable().describe('Event title'),
  isDeleted: z.boolean().describe('Whether the event has been deleted'),
  updatedAt: z.string().describe('Last updated timestamp')
});

export let listCalendarEventsTool = SlateTool.create(spec, {
  name: 'List Calendar Events',
  key: 'list_calendar_events',
  description: `List calendar events from connected calendars. Filter by calendar, time range, or update timestamp to find upcoming meetings or recently changed events. Useful for scheduling bots based on calendar data.`,
  constraints: [
    'Rate limit: 60 requests per minute per workspace.',
    'Calendar data is retained for 60 days in the past.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor for next page'),
      calendarId: z
        .string()
        .optional()
        .describe('Calendar ID from list_calendars; Calendar V2 requires this value'),
      startTimeAfter: z
        .string()
        .optional()
        .describe('Filter events starting after this ISO 8601 timestamp'),
      startTimeBefore: z
        .string()
        .optional()
        .describe('Filter events starting before this ISO 8601 timestamp'),
      updatedAtGte: z
        .string()
        .optional()
        .describe('Filter events updated at or after this ISO 8601 timestamp'),
      includeDeleted: z
        .boolean()
        .optional()
        .describe('Whether to include deleted events (default: false)'),
      pageSize: z
        .number()
        .optional()
        .describe('Legacy page-size hint; Recall.ai chooses the page size')
    })
  )
  .output(
    z.object({
      totalCount: z
        .number()
        .optional()
        .describe('Provider-wide total when supplied by Recall.ai; omitted when unavailable'),
      returnedCount: z.number().optional().describe('Number of results on this page'),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      events: z.array(calendarEventSchema).describe('List of calendar events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listCalendarEvents({
      cursor: ctx.input.cursor,
      calendarId: ctx.input.calendarId,
      startTimeAfter: ctx.input.startTimeAfter,
      startTimeBefore: ctx.input.startTimeBefore,
      updatedAtGte: ctx.input.updatedAtGte,
      isDeleted: ctx.input.includeDeleted === true ? undefined : false,
      pageSize: ctx.input.pageSize
    });

    let cursor = nextCursor(result.next);

    return {
      output: {
        totalCount: result.count,
        returnedCount: result.results.length,
        nextCursor: cursor,
        events: result.results.map(evt => ({
          eventId: evt.id,
          calendarId: evt.calendarId,
          meetingUrl: evt.meetingUrl,
          meetingPlatform: evt.meetingPlatform,
          startTime: evt.startTime,
          endTime: evt.endTime,
          title: evt.title,
          isDeleted: evt.isDeleted,
          updatedAt: evt.updatedAt
        }))
      },
      message: `Retrieved ${result.results.length} results${cursor ? ' (more available)' : ''}.`
    };
  })
  .build();
