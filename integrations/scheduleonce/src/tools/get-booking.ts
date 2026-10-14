import { SlateTool } from 'slates';
import { z } from 'zod';
import { bookingSchema, formatBooking } from '../lib/booking';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBooking = SlateTool.create(spec, {
  name: 'Get Booking',
  key: 'get_booking',
  description: `Retrieve detailed information about a specific booking by its ID.
Returns subject, duration, status, start time, location, virtual conferencing details, form submissions, attendees, and cancel/reschedule information.
Optionally expand related resources while keeping their IDs available.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      bookingId: z.string().min(1).describe('Booking ID. Call list_bookings to discover IDs.'),
      expand: z
        .array(
          z.enum([
            'owner',
            'booking_page',
            'master_page',
            'event_type',
            'booking_calendar',
            'contact',
            'conversation'
          ])
        )
        .optional()
        .describe('Related resources to expand in the response')
    })
  )
  .output(bookingSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let booking = await client.getBooking(ctx.input.bookingId, ctx.input.expand);
    return {
      output: formatBooking(booking),
      message: `Retrieved booking **${booking.id}** — "${booking.subject}" (${booking.status}), starting at ${booking.starting_time}.`
    };
  })
  .build();
