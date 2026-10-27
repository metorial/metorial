import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createHighLevelClient } from '../lib/client';
import { highLevelScope } from '../lib/scopes';
import { spec } from '../spec';

let calendarSchema = z
  .object({
    id: z.string().describe('Calendar ID for retrieving events'),
    name: z.string().describe('Calendar name'),
    locationId: z.string().optional().describe('Sub-account that owns this calendar'),
    groupId: z.string().nullish().describe('Calendar group ID, when assigned'),
    isActive: z.boolean().optional().describe('Whether the calendar is active')
  })
  .passthrough();

let eventSchema = z
  .object({
    id: z.string().describe('Appointment/event ID for retrieving appointment notes'),
    calendarId: z.string().optional().describe('Calendar that contains this event'),
    locationId: z.string().optional().describe('Sub-account that owns this event'),
    title: z.string().nullish().describe('Event title'),
    contactId: z.string().nullish().describe('Contact associated with the appointment'),
    assignedUserId: z.string().nullish().describe('Assigned appointment owner'),
    appointmentStatus: z.string().nullish().describe('Provider appointment status'),
    startTime: z.string().nullish().describe('Provider event start timestamp'),
    endTime: z.string().nullish().describe('Provider event end timestamp')
  })
  .passthrough();

let noteSchema = z
  .object({
    id: z.string().describe('Appointment note ID'),
    body: z.string().describe('Note text'),
    userId: z.string().nullish().describe('Author user ID'),
    dateAdded: z.string().nullish().describe('Provider creation timestamp')
  })
  .passthrough();

let getCalendars = SlateTool.create(spec, {
  name: 'Get Calendars',
  key: 'calendars_get_calendars',
  description:
    'Discover calendars and their names in the connected HighLevel sub-account. Use a returned calendar ID to retrieve events.',
  tags: { readOnly: true, destructive: false }
})
  .scopes(highLevelScope('calendars.readonly'))
  .input(
    z.object({
      groupId: z.string().min(1).optional().describe('Only return calendars in this group'),
      showDrafted: z
        .boolean()
        .optional()
        .describe('Include drafted calendars; HighLevel defaults to true')
    })
  )
  .output(
    z.object({
      locationId: z.string().describe('Connected sub-account ID'),
      calendars: z.array(calendarSchema).describe('Calendars returned by HighLevel'),
      count: z.number().describe('Number of returned calendars')
    })
  )
  .handleInvocation(async ctx => {
    let client = createHighLevelClient(ctx.auth);
    let response = await client.request<unknown>({
      method: 'GET',
      path: '/calendars/',
      scope: 'calendars.readonly',
      query: { locationId: client.locationId, ...ctx.input }
    });
    let parsed = z.object({ calendars: z.array(calendarSchema) }).safeParse(response);
    if (!parsed.success) {
      throw createApiServiceError('HighLevel returned an unexpected calendar list response.');
    }
    for (let calendar of parsed.data.calendars) client.assertLocation(calendar.locationId);
    return {
      output: {
        locationId: client.locationId,
        calendars: parsed.data.calendars,
        count: parsed.data.calendars.length
      },
      message: `Retrieved ${parsed.data.calendars.length} calendars.`
    };
  })
  .build();

let getCalendarEvents = SlateTool.create(spec, {
  name: 'Get Calendar Events',
  key: 'calendars_get_calendar_events',
  description:
    'Retrieve events for a calendar, group, or user in a time interval. Call calendars_get_calendars to discover calendar IDs.',
  instructions: [
    'Supply at least one of calendarId, groupId, or userId, and startTime earlier than endTime.',
    'Times are Unix milliseconds. This endpoint has no documented pagination; narrow the time interval for smaller results.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .scopes(highLevelScope('calendars/events.readonly'))
  .input(
    z.object({
      calendarId: z
        .string()
        .min(1)
        .optional()
        .describe('Calendar ID from calendars_get_calendars; one event selector is required'),
      groupId: z
        .string()
        .min(1)
        .optional()
        .describe('Calendar group ID; use this, calendarId, or userId'),
      userId: z
        .string()
        .min(1)
        .optional()
        .describe('Appointment owner user ID; use this, calendarId, or groupId'),
      startTime: z
        .number()
        .int()
        .nonnegative()
        .max(8640000000000000)
        .describe('Start of the event interval as a Unix timestamp in milliseconds'),
      endTime: z
        .number()
        .int()
        .nonnegative()
        .max(8640000000000000)
        .describe('End of the event interval as a Unix timestamp in milliseconds')
    })
  )
  .output(
    z.object({
      locationId: z.string().describe('Connected sub-account ID'),
      events: z.array(eventSchema).describe('Events in the requested interval'),
      count: z.number().describe('Number of returned events'),
      startTime: z.number().describe('Requested interval start in Unix milliseconds'),
      endTime: z.number().describe('Requested interval end in Unix milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let { calendarId, groupId, userId, startTime, endTime } = ctx.input;
    if (!calendarId && !groupId && !userId) {
      throw createApiServiceError(
        'Provide calendarId, groupId, or userId. Use calendars_get_calendars to discover calendars.'
      );
    }
    if (startTime >= endTime) {
      throw createApiServiceError(
        'startTime must be earlier than endTime, in Unix milliseconds.'
      );
    }
    let client = createHighLevelClient(ctx.auth);
    let response = await client.request<unknown>({
      method: 'GET',
      path: '/calendars/events',
      scope: 'calendars/events.readonly',
      query: {
        locationId: client.locationId,
        calendarId,
        groupId,
        userId,
        startTime: String(startTime),
        endTime: String(endTime)
      }
    });
    let parsed = z.object({ events: z.array(eventSchema) }).safeParse(response);
    if (!parsed.success) {
      throw createApiServiceError(
        'HighLevel returned an unexpected calendar events response.'
      );
    }
    for (let event of parsed.data.events) client.assertLocation(event.locationId);
    return {
      output: {
        locationId: client.locationId,
        events: parsed.data.events,
        count: parsed.data.events.length,
        startTime,
        endTime
      },
      message: `Retrieved ${parsed.data.events.length} calendar events.`
    };
  })
  .build();

let getAppointmentNotes = SlateTool.create(spec, {
  name: 'Get Appointment Notes',
  key: 'calendars_get_appointment_notes',
  description:
    'Retrieve one page of notes for an appointment. Use an appointment ID returned by calendars_get_calendar_events.',
  tags: { readOnly: true, destructive: false }
})
  .scopes(highLevelScope('calendars/events.readonly'))
  .input(
    z.object({
      appointmentId: z
        .string()
        .min(1)
        .describe('Appointment ID from calendars_get_calendar_events'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(20)
        .describe('Maximum notes per page, 1–20'),
      offset: z.number().int().min(0).default(0).describe('Number of notes to skip')
    })
  )
  .output(
    z.object({
      locationId: z.string().describe('Connected sub-account ID'),
      appointmentId: z.string().describe('Appointment whose notes were retrieved'),
      notes: z.array(noteSchema).describe('Notes in this page'),
      count: z.number().describe('Number of returned notes'),
      limit: z.number().describe('Requested page size'),
      offset: z.number().describe('Requested offset'),
      hasMore: z.boolean().describe('Whether HighLevel reports more notes'),
      nextOffset: z
        .number()
        .nullable()
        .describe('Offset for the next page, or null when complete')
    })
  )
  .handleInvocation(async ctx => {
    let client = createHighLevelClient(ctx.auth);
    let { appointmentId, limit, offset } = ctx.input;
    let response = await client.request<unknown>({
      method: 'GET',
      path: `/calendars/appointments/${encodeURIComponent(appointmentId)}/notes`,
      scope: 'calendars/events.readonly',
      query: { limit, offset }
    });
    let parsed = z
      .object({ notes: z.array(noteSchema), hasMore: z.boolean() })
      .safeParse(response);
    if (!parsed.success) {
      throw createApiServiceError(
        'HighLevel returned an unexpected appointment notes response.'
      );
    }
    return {
      output: {
        locationId: client.locationId,
        appointmentId,
        notes: parsed.data.notes,
        count: parsed.data.notes.length,
        limit,
        offset,
        hasMore: parsed.data.hasMore,
        nextOffset: parsed.data.hasMore ? offset + limit : null
      },
      message: `Retrieved ${parsed.data.notes.length} appointment notes.`
    };
  })
  .build();

export let calendarsTools = [getCalendarEvents, getAppointmentNotes, getCalendars];
