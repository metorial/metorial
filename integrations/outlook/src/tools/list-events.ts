import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { optionalString } from '../lib/output';
import { spec } from '../spec';

export let listEvents = SlateTool.create(spec, {
  name: 'List Calendar Events',
  key: 'list_events',
  description: `List calendar events from the authenticated user's calendar. Supports filtering by date range (calendar view), specific calendar, and OData filters. When **startDateTime** and **endDateTime** are provided, uses the calendarView endpoint which expands recurring events into individual occurrences.`,
  instructions: [
    'Provide both **startDateTime** and **endDateTime** (ISO 8601 format) to get a calendar view with expanded recurrences.',
    'Without date range, returns events from the events collection without expanding recurrences.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      calendarId: z
        .string()
        .optional()
        .describe('Calendar ID. Omit to use the default calendar.'),
      startDateTime: z
        .string()
        .optional()
        .describe('Start of date range in ISO 8601 format (e.g., "2024-01-01T00:00:00Z")'),
      endDateTime: z.string().optional().describe('End of date range in ISO 8601 format'),
      filter: z.string().optional().describe('OData filter expression'),
      orderby: z
        .string()
        .optional()
        .describe('OData orderby expression (e.g., "start/dateTime asc")'),
      top: z.number().optional().describe('Maximum number of events to return'),
      skip: z.number().optional().describe('Number of events to skip for pagination')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          eventId: z.string(),
          subject: z.string().optional(),
          bodyPreview: z.string().optional(),
          startDateTime: z.string().optional(),
          startTimeZone: z.string().optional(),
          endDateTime: z.string().optional(),
          endTimeZone: z.string().optional(),
          locationDisplayName: z.string().optional(),
          isAllDay: z.boolean().optional(),
          isCancelled: z.boolean().optional(),
          isOnlineMeeting: z.boolean().optional(),
          onlineMeetingJoinUrl: z.string().optional(),
          organizerEmail: z.string().optional(),
          organizerName: z.string().optional(),
          attendeeCount: z.number().optional(),
          showAs: z.string().optional(),
          importance: z.string().optional(),
          hasAttachments: z.boolean().optional(),
          webLink: z.string().optional(),
          categories: z.array(z.string()).optional(),
          seriesMasterId: z.string().optional(),
          type: z.string().optional()
        })
      ),
      nextPageAvailable: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listEvents({
      calendarId: ctx.input.calendarId,
      startDateTime: ctx.input.startDateTime,
      endDateTime: ctx.input.endDateTime,
      filter: ctx.input.filter,
      orderby: ctx.input.orderby,
      top: ctx.input.top || 25,
      skip: ctx.input.skip
    });

    let events = result.value.map(ev => ({
      eventId: ev.id,
      subject: ev.subject,
      bodyPreview: ev.bodyPreview,
      startDateTime: ev.start?.dateTime,
      startTimeZone: ev.start?.timeZone,
      endDateTime: ev.end?.dateTime,
      endTimeZone: ev.end?.timeZone,
      locationDisplayName: ev.location?.displayName,
      isAllDay: ev.isAllDay,
      isCancelled: ev.isCancelled,
      isOnlineMeeting: ev.isOnlineMeeting,
      onlineMeetingJoinUrl: optionalString(ev.onlineMeeting?.joinUrl || ev.onlineMeetingUrl),
      organizerEmail: optionalString(ev.organizer?.emailAddress?.address),
      organizerName: optionalString(ev.organizer?.emailAddress?.name),
      attendeeCount: ev.attendees?.length,
      showAs: ev.showAs,
      importance: ev.importance,
      hasAttachments: ev.hasAttachments,
      webLink: ev.webLink,
      categories: ev.categories,
      seriesMasterId: optionalString(ev.seriesMasterId),
      type: optionalString(ev.type)
    }));

    return {
      output: {
        events,
        nextPageAvailable: !!result['@odata.nextLink']
      },
      message: `Found **${events.length}** calendar event(s).`
    };
  })
  .build();
