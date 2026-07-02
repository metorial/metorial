import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBookings = SlateTool.create(spec, {
  name: 'List Bookings',
  key: 'list_bookings',
  description: `Retrieve a list of bookings for the authenticated user. Supports filtering by status, attendee email/name, event type, date range, and more. Returns booking details including attendees, event type, timing, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['upcoming', 'recurring', 'past', 'cancelled', 'unconfirmed'])
        .optional()
        .describe('Filter bookings by status'),
      attendeeEmail: z.string().optional().describe('Filter by attendee email address'),
      attendeeName: z.string().optional().describe('Filter by attendee name'),
      eventTypeId: z.number().optional().describe('Filter by event type ID'),
      eventTypeIds: z.string().optional().describe('Comma-separated list of event type IDs'),
      bookingUid: z.string().optional().describe('Filter by booking UID'),
      teamId: z.number().optional().describe('Filter by team ID'),
      teamIds: z.string().optional().describe('Comma-separated list of team IDs'),
      afterStart: z
        .string()
        .optional()
        .describe('Only return bookings starting after this ISO 8601 date'),
      beforeEnd: z
        .string()
        .optional()
        .describe('Only return bookings ending before this ISO 8601 date'),
      afterCreatedAt: z
        .string()
        .optional()
        .describe('Only return bookings created after this ISO 8601 date'),
      beforeCreatedAt: z
        .string()
        .optional()
        .describe('Only return bookings created before this ISO 8601 date'),
      afterUpdatedAt: z
        .string()
        .optional()
        .describe('Only return bookings updated after this ISO 8601 date'),
      beforeUpdatedAt: z
        .string()
        .optional()
        .describe('Only return bookings updated before this ISO 8601 date'),
      sortStart: z.enum(['asc', 'desc']).optional().describe('Sort order by start time'),
      sortEnd: z.enum(['asc', 'desc']).optional().describe('Sort order by end time'),
      sortCreated: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort order by booking creation time'),
      sortUpdatedAt: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort order by booking update time'),
      cursor: z
        .string()
        .optional()
        .describe('Opaque pagination cursor from a previous list_bookings response'),
      limit: z.number().optional().describe('Number of bookings to return, default 50'),
      take: z
        .number()
        .optional()
        .describe('Deprecated alias for limit; prefer limit for cursor pagination')
    })
  )
  .output(
    z.object({
      bookings: z.array(z.any()).describe('List of bookings matching the filter criteria'),
      pagination: z
        .any()
        .optional()
        .describe('Cursor pagination metadata including nextCursor and hasMore')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let params: Record<string, any> = {};
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.attendeeEmail) params.attendeeEmail = ctx.input.attendeeEmail;
    if (ctx.input.attendeeName) params.attendeeName = ctx.input.attendeeName;
    if (ctx.input.eventTypeId) params.eventTypeId = ctx.input.eventTypeId;
    if (ctx.input.eventTypeIds) params.eventTypeIds = ctx.input.eventTypeIds;
    if (ctx.input.bookingUid) params.bookingUid = ctx.input.bookingUid;
    if (ctx.input.teamId) params.teamId = ctx.input.teamId;
    if (ctx.input.teamIds) params.teamIds = ctx.input.teamIds;
    if (ctx.input.afterStart) params.afterStart = ctx.input.afterStart;
    if (ctx.input.beforeEnd) params.beforeEnd = ctx.input.beforeEnd;
    if (ctx.input.afterCreatedAt) params.afterCreatedAt = ctx.input.afterCreatedAt;
    if (ctx.input.beforeCreatedAt) params.beforeCreatedAt = ctx.input.beforeCreatedAt;
    if (ctx.input.afterUpdatedAt) params.afterUpdatedAt = ctx.input.afterUpdatedAt;
    if (ctx.input.beforeUpdatedAt) params.beforeUpdatedAt = ctx.input.beforeUpdatedAt;
    if (ctx.input.sortStart) params.sortStart = ctx.input.sortStart;
    if (ctx.input.sortEnd) params.sortEnd = ctx.input.sortEnd;
    if (ctx.input.sortCreated) params.sortCreated = ctx.input.sortCreated;
    if (ctx.input.sortUpdatedAt) params.sortUpdatedAt = ctx.input.sortUpdatedAt;
    if (ctx.input.cursor) params.cursor = ctx.input.cursor;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (!ctx.input.limit && ctx.input.take) params.limit = ctx.input.take;

    let { bookings, pagination } = await client.listBookings(params);

    let count = Array.isArray(bookings) ? bookings.length : 0;
    return {
      output: { bookings: Array.isArray(bookings) ? bookings : [], pagination },
      message: `Found **${count}** booking(s).`
    };
  })
  .build();
