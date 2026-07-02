import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attendeeSchema = z.object({
  attendeeId: z.string().describe('Unique attendee identifier'),
  displayName: z.string().describe('Display name of the attendee'),
  email: z.string().describe('Email address'),
  firstName: z.string().describe('First name'),
  lastName: z.string().describe('Last name'),
  isOrganizer: z.boolean().describe('Whether this attendee is the organizer'),
  responseStatus: z.string().describe('Attendee response status'),
  timeZone: z.string().describe('Attendee time zone'),
  phoneNumber: z.string().nullable().optional().describe('Phone number')
});

let eventSchema = z.object({
  eventId: z.string().describe('Unique event identifier'),
  summary: z.string().describe('Event title'),
  description: z.string().nullable().optional().describe('Event description'),
  startAt: z.string().describe('Event start time (ISO 8601)'),
  endAt: z.string().describe('Event end time (ISO 8601)'),
  duration: z.number().describe('Duration in minutes'),
  state: z.string().describe('Event state (confirmed, canceled, awaiting_reschedule, etc.)'),
  url: z.string().describe('Public event URL'),
  createdAt: z.string().describe('Creation timestamp'),
  attendees: z.array(attendeeSchema).describe('Event attendees'),
  conferencing: z
    .object({
      type: z.string().nullable().optional(),
      joinUrl: z.string().nullable().optional(),
      meetingId: z.string().nullable().optional()
    })
    .nullable()
    .optional()
    .describe('Conferencing details'),
  location: z.string().nullable().optional().describe('Event location'),
  metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata'),
  isGroupSession: z.boolean().optional().describe('Whether this is a group session')
});

export let listEventsTool = SlateTool.create(spec, {
  name: 'List Events',
  key: 'list_events',
  description: `List scheduled events from SavvyCal. Supports filtering by event state and pagination via cursor-based navigation. Returns event details including attendees, conferencing info, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      state: z
        .enum([
          'confirmed',
          'canceled',
          'awaiting_reschedule',
          'awaiting_checkout',
          'checkout_expired',
          'awaiting_approval',
          'declined',
          'tentative'
        ])
        .optional()
        .describe('Filter by event state'),
      period: z.string().optional().describe('Filter period (e.g., "all")'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of events to return (1-100, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor for fetching the next page')
    })
  )
  .output(
    z.object({
      events: z.array(eventSchema),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for the next page, null if no more pages'),
      previousCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listEvents({
      state: ctx.input.state,
      period: ctx.input.period,
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });

    let events = result.entries.map((e: any) => ({
      eventId: e.id,
      summary: e.summary,
      description: e.description,
      startAt: e.start_at,
      endAt: e.end_at,
      duration: e.duration,
      state: e.state,
      url: e.url,
      createdAt: e.created_at,
      attendees: (e.attendees ?? []).map((a: any) => ({
        attendeeId: a.id,
        displayName: a.display_name,
        email: a.email,
        firstName: a.first_name,
        lastName: a.last_name,
        isOrganizer: a.is_organizer,
        responseStatus: a.response_status,
        timeZone: a.time_zone,
        phoneNumber: a.phone_number
      })),
      conferencing: e.conferencing
        ? {
            type: e.conferencing.type,
            joinUrl: e.conferencing.join_url,
            meetingId: e.conferencing.meeting_id
          }
        : null,
      location: e.location,
      metadata: e.metadata,
      isGroupSession: e.is_group_session
    }));

    return {
      output: {
        events,
        nextCursor: result.metadata.after,
        previousCursor: result.metadata.before
      },
      message: `Found **${events.length}** event(s).${result.metadata.after ? ' More events available via pagination.' : ''}`
    };
  })
  .build();
