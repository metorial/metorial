import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let STAY_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

export let manageBookingStay = SlateTool.create(spec, {
  name: 'Manage Booking Stay',
  key: 'manage_booking_stay',
  description: `Record when a guest actually checked in or checked out of a booking. This logs the real arrival or departure time of the stay and is separate from the booking's status and its arrival/departure dates.`,
  instructions: [
    'The time is a time of day only, written as HH:mm:ss, for example 15:30:00.',
    "The time is interpreted in the property's own timezone, so do not convert it to UTC and do not send a full date or timestamp.",
    'Use the Get Booking tool afterwards to read back the recorded check-in and check-out times.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bookingId: z.number().describe('The ID of the booking to check in or check out'),
      action: z
        .enum(['checkin', 'checkout'])
        .describe(
          'Use "checkin" to record the guest arrival time, or "checkout" to record the guest departure time'
        ),
      time: z
        .string()
        .describe(
          "Time of day in HH:mm:ss format, for example 15:30:00, expressed in the property's own local timezone. This is not a UTC instant and not a full date or ISO timestamp."
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the time was recorded successfully'),
      bookingId: z.number().describe('The ID of the booking that was updated'),
      action: z.enum(['checkin', 'checkout']).describe('The action that was performed'),
      time: z
        .string()
        .describe("The time that was recorded, in the property's local timezone (HH:mm:ss)")
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!STAY_TIME_PATTERN.test(ctx.input.time)) {
      throw createApiServiceError(
        `"${ctx.input.time}" is not a valid time. Provide a time of day as HH:mm:ss in the property's local timezone, for example 15:30:00.`
      );
    }

    // The endpoint answers 200 with an empty body, so nothing is read back here.
    await client.setBookingStayTime(ctx.input.bookingId, ctx.input.action, ctx.input.time);

    let label = ctx.input.action === 'checkin' ? 'check-in' : 'check-out';

    return {
      output: {
        success: true,
        bookingId: ctx.input.bookingId,
        action: ctx.input.action,
        time: ctx.input.time
      },
      message: `Recorded ${label} for booking **#${ctx.input.bookingId}** at **${ctx.input.time}** property local time.`
    };
  })
  .build();
