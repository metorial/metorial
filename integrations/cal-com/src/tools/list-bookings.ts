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
      afterStart: z
        .string()
        .optional()
        .describe('Only return bookings starting after this ISO 8601 date'),
      beforeEnd: z
        .string()
        .optional()
        .describe('Only return bookings ending before this ISO 8601 date'),
      sortStart: z.enum(['asc', 'desc']).optional().describe('Sort order by start time'),
      take: z.number().optional().describe('Number of bookings to return (pagination)'),
      skip: z.number().optional().describe('Number of bookings to skip (pagination)')
    })
  )
  .output(
    z.object({
      bookings: z.array(z.any()).describe('List of bookings matching the filter criteria')
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
    if (ctx.input.afterStart) params.afterStart = ctx.input.afterStart;
    if (ctx.input.beforeEnd) params.beforeEnd = ctx.input.beforeEnd;
    if (ctx.input.sortStart) params.sortStart = ctx.input.sortStart;
    if (ctx.input.take) params.take = ctx.input.take;
    if (ctx.input.skip) params.skip = ctx.input.skip;

    let bookings = await client.listBookings(params);

    let count = Array.isArray(bookings) ? bookings.length : 0;
    return {
      output: { bookings: Array.isArray(bookings) ? bookings : [] },
      message: `Found **${count}** booking(s).`
    };
  })
  .build();
