import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let externalBooking = z.looseObject({
  created_at: z
    .string()
    .nullable()
    .optional()
    .describe('When the external booking was created'),
  content: z
    .string()
    .nullable()
    .optional()
    .describe('Contents of the external booking as recorded from the channel')
});

export let listExternalBookings = SlateTool.create(spec, {
  name: 'List External Bookings',
  key: 'list_external_bookings',
  description: `List the channel-side bookings linked to a booking, such as the matching reservation on Airbnb, Booking.com, or Vrbo. Use this to confirm that a booking originated from or is synced with an external channel and to read what that channel sent.`,
  instructions: [
    'Each entry reports when the external booking was recorded and the content received from the channel. Read the content to identify which channel it came from, since there is no separate channel field.',
    'An empty result means the booking has no linked channel-side reservation, which is expected for bookings created directly in the account.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bookingId: z
        .number()
        .describe('The ID of the booking to list linked external bookings for')
    })
  )
  .output(
    z.object({
      externalBookings: z
        .array(externalBooking)
        .describe('External channel bookings linked to this booking'),
      count: z.number().describe('Number of external bookings returned'),
      bookingId: z.number().describe('The booking the external bookings are linked to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listExternalBookings(ctx.input.bookingId);

    let externalBookings = Array.isArray(result?.external_bookings)
      ? result.external_bookings
      : [];

    if (externalBookings.length === 0) {
      return {
        output: { externalBookings, count: 0, bookingId: ctx.input.bookingId },
        message: `Booking **#${ctx.input.bookingId}** has no linked external channel bookings.`
      };
    }

    return {
      output: {
        externalBookings,
        count: externalBookings.length,
        bookingId: ctx.input.bookingId
      },
      message: `Retrieved **${externalBookings.length}** external bookings linked to booking **#${ctx.input.bookingId}**.`
    };
  })
  .build();
