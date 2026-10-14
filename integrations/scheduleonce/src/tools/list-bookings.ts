import { SlateTool } from 'slates';
import { z } from 'zod';
import { bookingSchema, formatBooking } from '../lib/booking';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBookings = SlateTool.create(spec, {
  name: 'List Bookings',
  key: 'list_bookings',
  description: `Search and retrieve bookings from your ScheduleOnce account with flexible filtering.
Filter by starting time range, last updated time, creation time, status, owner, booking page, event type, or booking calendar.
Supports cursor-based pagination for navigating large result sets.`,
  instructions: [
    'Use ISO 8601 date strings for time filters (e.g., "2024-01-01T00:00:00Z").',
    'Combine multiple filters to narrow results. For example, filter by status and a time range.',
    'Pass nextCursor from previous results as cursor to paginate through bookings.'
  ],
  constraints: ['Maximum 100 bookings per request (default 10).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startingTimeAfter: z
        .string()
        .optional()
        .describe('Return bookings starting after this ISO 8601 time'),
      startingTimeBefore: z
        .string()
        .optional()
        .describe('Return bookings starting before this ISO 8601 time'),
      lastUpdatedAfter: z
        .string()
        .optional()
        .describe('Return bookings updated after this ISO 8601 time'),
      createdAfter: z
        .string()
        .optional()
        .describe('Return bookings created after this ISO 8601 time'),
      status: z
        .enum(['requested', 'scheduled', 'rescheduled', 'completed', 'canceled', 'no_show'])
        .optional()
        .describe('Filter by booking status'),
      ownerUserId: z
        .string()
        .optional()
        .describe('Booking owner user ID. Call list_users to discover IDs.'),
      bookingPageId: z
        .string()
        .optional()
        .describe('Booking page ID. Call list_booking_pages to discover IDs.'),
      eventTypeId: z
        .string()
        .optional()
        .describe('Event type ID. Call list_event_types to discover IDs.'),
      bookingCalendarId: z
        .string()
        .optional()
        .describe('Booking calendar ID. Call list_booking_calendars to discover IDs.'),
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Limit must be a safe integer.')
        .min(1)
        .max(100)
        .optional()
        .describe('Number of bookings to return (1-100, default 10)'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor for pagination (use the last booking ID from previous results)')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of bookings returned in this page'),
      hasMore: z.boolean().describe('Whether more bookings are available'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Pass this ID as cursor to fetch the next page'),
      bookings: z.array(bookingSchema).describe('List of bookings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listBookings({
      startingTimeGt: ctx.input.startingTimeAfter,
      startingTimeLt: ctx.input.startingTimeBefore,
      lastUpdatedTimeGt: ctx.input.lastUpdatedAfter,
      creationTimeGt: ctx.input.createdAfter,
      status: ctx.input.status,
      owner: ctx.input.ownerUserId,
      bookingPage: ctx.input.bookingPageId,
      eventType: ctx.input.eventTypeId,
      bookingCalendar: ctx.input.bookingCalendarId,
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });

    let bookings = result.data.map(formatBooking);

    return {
      output: {
        count: result.count,
        hasMore: result.has_more,
        nextCursor: result.has_more ? (result.data.at(-1)?.id ?? null) : null,
        bookings
      },
      message: `Returned **${bookings.length}** booking(s) in this page.`
    };
  })
  .build();
