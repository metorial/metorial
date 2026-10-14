import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelBooking = SlateTool.create(spec, {
  name: 'Cancel Booking',
  key: 'cancel_booking',
  description:
    'Cancel an existing booking, with an optional reason and cancellation email. Call list_bookings to find the booking ID.',
  tags: { destructive: true }
})
  .input(
    z.object({
      bookingId: z.string().min(1).describe('Booking ID. Call list_bookings to discover IDs.'),
      cancellationReason: z.string().optional().describe('Reason for canceling the booking'),
      sendCancellationEmail: z
        .boolean()
        .optional()
        .describe('Send the provider cancellation email; defaults to true')
    })
  )
  .output(
    z.object({
      bookingId: z.string().describe('ID of the booking whose cancellation was accepted'),
      canceled: z.boolean().describe('Whether the provider accepted the cancellation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.cancelBooking(
      ctx.input.bookingId,
      ctx.input.cancellationReason,
      ctx.input.sendCancellationEmail
    );
    return {
      output: { bookingId: ctx.input.bookingId, canceled: true },
      message: `Canceled booking **${ctx.input.bookingId}**.`
    };
  })
  .build();
