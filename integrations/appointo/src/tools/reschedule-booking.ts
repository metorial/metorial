import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let rescheduleBooking = SlateTool.create(spec, {
  name: 'Reschedule Booking',
  key: 'reschedule_booking',
  description: `Reschedule an existing booking to a new timeslot. Can reschedule the entire booking or only specific customers within a group booking. Use the override option to forcefully reschedule to a given timeslot.`,
  constraints: ['Write operations are limited to 100 requests per day.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bookingId: z.number().describe('ID of the booking to reschedule'),
      timestring: z.string().describe('New timeslot in ISO 8601 datetime format'),
      customerIds: z
        .array(z.number())
        .optional()
        .describe(
          'Specific customer IDs to reschedule (omit to reschedule the entire booking)'
        ),
      override: z
        .boolean()
        .optional()
        .describe(
          'Force reschedule to the given timeslot even if it appears occupied (default: false)'
        )
    })
  )
  .output(
    z
      .object({
        bookingId: z.number().optional().describe('ID of the rescheduled booking'),
        status: z.string().optional().describe('Updated booking status')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.rescheduleBooking({
      bookingId: ctx.input.bookingId,
      timestring: ctx.input.timestring,
      customerIds: ctx.input.customerIds,
      override: ctx.input.override
    });

    let booking = result?.booking ?? result?.data ?? result;

    return {
      output: {
        bookingId: booking?.id ?? booking?.booking_id ?? ctx.input.bookingId,
        status: booking?.status,
        ...booking
      },
      message: `Booking **#${ctx.input.bookingId}** rescheduled to ${ctx.input.timestring}${ctx.input.customerIds ? ` for ${ctx.input.customerIds.length} customer(s)` : ''}.`
    };
  })
  .build();
