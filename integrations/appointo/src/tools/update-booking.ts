import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateBooking = SlateTool.create(spec, {
  name: 'Update Booking Buffers',
  key: 'update_booking',
  description: `Update buffer times on an existing booking. Buffer times add padding before and/or after the booking timeslot.`,
  constraints: ['Write operations are limited to 100 requests per day.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bookingId: z.number().describe('ID of the booking to update'),
      startBufferTime: z
        .number()
        .min(0)
        .optional()
        .describe('Buffer time in minutes before the booking'),
      endBufferTime: z
        .number()
        .min(0)
        .optional()
        .describe('Buffer time in minutes after the booking')
    })
  )
  .output(
    z
      .object({
        bookingId: z.number().optional().describe('ID of the updated booking'),
        status: z.string().optional().describe('Updated booking status')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateBooking(ctx.input.bookingId, {
      startBufferTime: ctx.input.startBufferTime,
      endBufferTime: ctx.input.endBufferTime
    });

    let booking = result?.booking ?? result?.data ?? result;

    return {
      output: {
        bookingId: booking?.id ?? booking?.booking_id ?? ctx.input.bookingId,
        status: booking?.status,
        ...booking
      },
      message: `Buffer times updated on booking **#${ctx.input.bookingId}**${ctx.input.startBufferTime != null ? ` (start: ${ctx.input.startBufferTime}min)` : ''}${ctx.input.endBufferTime != null ? ` (end: ${ctx.input.endBufferTime}min)` : ''}.`
    };
  })
  .build();
