import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBooking = SlateTool.create(spec, {
  name: 'Get Booking',
  key: 'get_booking',
  description: `Retrieve a single booking by ID, or list all bookings with optional pagination.
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
      page: z.number().optional().describe('Page number for pagination (0-based)'),
      limit: z.number().optional().describe('Number of bookings per page')
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
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.bookingId) {
      let booking = await client.getBooking(ctx.input.bookingId);
      return {
        output: {
          bookings: [
            {
              bookingId: booking._id,
              resourceId: booking.resource,
              projectId: booking.project,
              start: booking.start,
              end: booking.end,
              title: booking.title,
              state: booking.state,
              stateValue: booking.stateValue,
              type: booking.type,
              note: booking.note,
              createdDate: booking.createdDate,
              updatedDate: booking.updatedDate
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
          resourceId: b.resource,
          projectId: b.project,
          start: b.start,
          end: b.end,
          title: b.title,
          state: b.state,
          stateValue: b.stateValue,
          type: b.type,
          note: b.note,
          createdDate: b.createdDate,
          updatedDate: b.updatedDate
        }))
      },
      message: `Retrieved **${bookings.length}** bookings.`
    };
  })
  .build();
