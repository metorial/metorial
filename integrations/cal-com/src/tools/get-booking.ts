import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBooking = SlateTool.create(spec, {
  name: 'Get Booking',
  key: 'get_booking',
  description: `Retrieve detailed information about a specific booking by its UID. For recurring bookings, passing the recurring booking UID returns all recurrences.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bookingUid: z.string().describe('UID of the booking to retrieve')
    })
  )
  .output(
    z.object({
      booking: z
        .any()
        .describe(
          'Booking details including attendees, event type, timing, location, and status'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let booking = await client.getBooking(ctx.input.bookingUid);

    return {
      output: { booking },
      message: `Retrieved booking **${ctx.input.bookingUid}**.`
    };
  })
  .build();
