import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBooking = SlateTool.create(spec, {
  name: 'Get Booking',
  key: 'get_booking',
  description: `Retrieve detailed information about a specific booking/reservation by its ID. Returns full booking details including guest information, dates, property, room types, status, and pricing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bookingId: z.number().describe('The ID of the booking to retrieve')
    })
  )
  .output(
    z.object({
      booking: z.record(z.string(), z.any()).describe('Full booking details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let booking = await client.getBooking(ctx.input.bookingId);

    let guestName = booking.guest?.name ?? 'Unknown guest';
    let status = booking.status ?? 'unknown';

    return {
      output: { booking },
      message: `Retrieved booking **#${ctx.input.bookingId}** for **${guestName}** (status: ${status}).`
    };
  })
  .build();
