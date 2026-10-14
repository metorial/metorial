import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBooking = SlateTool.create(spec, {
  name: 'Get Booking',
  key: 'get_booking',
  description: `Retrieve a single booking by ID, or list a page of bookings. The API returns 20 by default; continue paging until fewer than the requested limit are returned.
Returns booking details including resource, project, dates, state, and duration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bookingId: z
        .string()
        .optional()
        .describe('Specific booking ID to retrieve. If omitted, lists all bookings.'),
      page: z.number().min(0).optional().describe('Page number for pagination (0-based)'),
      limit: z.number().min(1).max(1000).optional().describe('Number of bookings per page')
    })
  )
  .output(
    z.object({
      bookings: z
        .array(
          z.object({
            bookingId: z.string().describe('Booking ID'),
            resourceId: z.string().optional().describe('Resource ID'),
            projectId: z.string().optional().describe('Project ID'),
            start: z.string().optional().describe('Start date'),
            end: z.string().optional().describe('End date'),
            title: z.string().optional().describe('Booking title'),
            state: z.string().optional().describe('State type'),
            stateValue: z.number().optional().describe('State value'),
            type: z.string().optional().describe('Booking type'),
            note: z.string().optional().describe('Booking note'),
            createdDate: z.string().optional().describe('Creation timestamp'),
            updatedDate: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of bookings')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.page !== undefined && !Number.isInteger(ctx.input.page)) {
      throw createApiServiceError('page must be a whole number starting at 0.');
    }
    if (ctx.input.limit !== undefined && !Number.isInteger(ctx.input.limit)) {
      throw createApiServiceError('limit must be a whole number between 1 and 1000.');
    }
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.bookingId) {
      let booking = await client.getBooking(ctx.input.bookingId);
      return {
        output: {
          bookings: [
            {
              bookingId: booking._id,
              resourceId: booking.resource ?? undefined,
              projectId: booking.project ?? undefined,
              start: booking.start ?? undefined,
              end: booking.end ?? undefined,
              title: booking.title ?? undefined,
              state: booking.state ?? undefined,
              stateValue: booking.stateValue ?? undefined,
              type: booking.type ?? undefined,
              note: booking.note ?? undefined,
              createdDate: booking.createdDate ?? undefined,
              updatedDate: booking.updatedDate ?? undefined
            }
          ]
        },
        message: `Retrieved booking \`${booking._id}\`.`
      };
    }

    let bookings = await client.getBookings(ctx.input.page, ctx.input.limit);
    return {
      output: {
        bookings: bookings.map((b: any) => ({
          bookingId: b._id,
          resourceId: b.resource ?? undefined,
          projectId: b.project ?? undefined,
          start: b.start ?? undefined,
          end: b.end ?? undefined,
          title: b.title ?? undefined,
          state: b.state ?? undefined,
          stateValue: b.stateValue ?? undefined,
          type: b.type ?? undefined,
          note: b.note ?? undefined,
          createdDate: b.createdDate ?? undefined,
          updatedDate: b.updatedDate ?? undefined
        }))
      },
      message: `Retrieved **${bookings.length}** bookings.`
    };
  })
  .build();
