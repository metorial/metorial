import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let rescheduleBooking = SlateTool.create(spec, {
  name: 'Request Booking Reschedule',
  key: 'reschedule_booking',
  description:
    'Submit a request to move a booking to a new local start and end time, subject to its reschedule policy and availability. Acceptance confirms submission; it does not confirm the booking has moved.',
  instructions: [
    'Use get_inventory to find a suitable new time, then get_booking after submission to check the final schedule.'
  ]
})
  .input(
    z.object({
      bookingId: z.string().describe('Booking ID from create_booking or get_booking'),
      startDateTime: z
        .string()
        .describe('Requested start in the experience local time, YYYY-MM-DDTHH:mm:ss'),
      endDateTime: z
        .string()
        .describe('Requested end in the experience local time, YYYY-MM-DDTHH:mm:ss'),
      comment: z
        .string()
        .optional()
        .describe('Additional information for the reschedule request')
    })
  )
  .output(
    z.object({
      bookingId: z.string(),
      success: z
        .boolean()
        .describe('Whether Headout accepted the reschedule request for processing'),
      message: z.string().optional().describe('Provider acknowledgement'),
      raw: z.unknown().optional().describe('Complete provider acknowledgement')
    })
  )
  .handleInvocation(async ctx => {
    let start = Date.parse(ctx.input.startDateTime);
    let end = Date.parse(ctx.input.endDateTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      throw createApiServiceError(
        'Provide valid startDateTime and endDateTime values with the end at or after the start.'
      );
    }
    let client = new Client({ token: ctx.auth.token, ...ctx.config });
    let result = await client.rescheduleBooking(ctx.input.bookingId, {
      startDateTime: ctx.input.startDateTime,
      endDateTime: ctx.input.endDateTime,
      comment: ctx.input.comment
    });
    if (result.success !== true) {
      throw createApiServiceError(
        `Headout did not accept the reschedule request: ${result.message ?? 'No successful acknowledgement was returned.'}`,
        { reason: 'headout_reschedule_rejected' }
      );
    }
    return {
      output: {
        bookingId: ctx.input.bookingId,
        success: true,
        message: result.message ?? undefined,
        raw: result
      },
      message: `Reschedule request submitted for booking **${ctx.input.bookingId}**. Use get_booking to check the final schedule.`
    };
  })
  .build();
