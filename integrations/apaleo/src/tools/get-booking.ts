import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let getBooking = SlateTool.create(spec, {
  name: 'Get Booking',
  key: 'get_booking',
  description:
    'Retrieve a booking and its reservations, booker, comments, and payment account details by booking ID.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      bookingId: z
        .string()
        .describe('Booking ID returned by create_booking or list_bookings.'),
      expand: z
        .array(
          z.enum([
            'property',
            'unitGroup',
            'ratePlan',
            'services',
            'reservations',
            'propertyValues'
          ])
        )
        .optional()
        .describe('Resources to expand in the booking response.')
    })
  )
  .output(z.object({ bookingId: z.string(), booking: z.record(z.string(), z.unknown()) }))
  .handleInvocation(async ctx => {
    let booking = await new ApaleoClient(ctx.auth.token).getBooking(
      ctx.input.bookingId,
      ctx.input.expand ?? ['reservations']
    );
    return {
      output: { bookingId: booking.id, booking },
      message: `Retrieved booking **${booking.id}**.`
    };
  })
  .build();
