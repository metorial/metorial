import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelBooking = SlateTool.create(spec, {
  name: 'Cancel Booking',
  key: 'cancel_booking',
  description: `Cancel an existing booking. Can cancel the entire booking or only specific customers within a group booking by providing customer IDs.`,
  constraints: ['Write operations are limited to 100 requests per day.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      bookingId: z.number().describe('ID of the booking to cancel'),
      customerIds: z
        .array(z.number())
        .optional()
        .describe('Specific customer IDs to cancel (omit to cancel the entire booking)')
    })
  )
  .output(
    z
      .object({
        bookingId: z.number().optional().describe('ID of the canceled booking'),
        status: z.string().optional().describe('Updated booking status')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.cancelBooking({
      bookingId: ctx.input.bookingId,
      customerIds: ctx.input.customerIds
    });

    let booking = result?.booking ?? result?.data ?? result;

    return {
      output: {
        bookingId: booking?.id ?? booking?.booking_id ?? ctx.input.bookingId,
        status: booking?.status,
        ...booking
      },
      message: `Booking **#${ctx.input.bookingId}** canceled${ctx.input.customerIds ? ` for ${ctx.input.customerIds.length} customer(s)` : ''}.`
    };
  })
  .build();
