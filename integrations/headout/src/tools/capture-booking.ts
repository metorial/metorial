import { SlateTool } from 'slates';
import { z } from 'zod';
import { bookingSchema, mapBooking } from '../lib/booking';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let captureBooking = SlateTool.create(spec, {
  name: 'Capture Booking',
  key: 'capture_booking',
  description:
    'Capture an UNCAPTURED booking to start fulfillment, optionally assigning your partner reference ID.',
  instructions: [
    'Use the bookingId returned by create_booking with captureImmediately: false.',
    'Capture within one hour of creation. Check get_booking before retrying a capture whose result is uncertain.',
    'PENDING means fulfillment has started. Use get_booking to check completion and retrieve tickets.'
  ]
})
  .input(
    z.object({
      bookingId: z.string().describe('Booking ID returned by create_booking or get_booking'),
      partnerReferenceId: z
        .string()
        .optional()
        .describe('Your own reference ID for reconciliation')
    })
  )
  .output(bookingSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, ...ctx.config });
    let booking = await client.captureBooking(ctx.input.bookingId, {
      partnerReferenceId: ctx.input.partnerReferenceId
    });
    let output = mapBooking({
      ...booking,
      bookingId: booking.bookingId ?? ctx.input.bookingId
    });
    for (let ticket of booking.tickets ?? []) {
      if (ticket.type === 'PDF_URL' && ticket.url) {
        await ctx.addAttachment({ type: 'url', url: ticket.url, mimeType: 'application/pdf' });
      }
    }
    return {
      output,
      message: `Booking **${output.bookingId}** capture returned status **${output.status}**. Use get_booking to check fulfillment.`
    };
  })
  .build();
