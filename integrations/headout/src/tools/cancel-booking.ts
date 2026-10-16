import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelBooking = SlateTool.create(spec, {
  name: 'Request Booking Cancellation',
  key: 'cancel_booking',
  description:
    'Submit a cancellation request for a booking owned by your partner account, subject to its cancellation policy. Acceptance confirms submission; it does not confirm cancellation or a refund.',
  instructions: ['Use get_booking after submission to check the final booking status.'],
  tags: { destructive: true }
})
  .input(
    z.object({
      bookingId: z.string().describe('Booking ID from create_booking or get_booking'),
      reason: z
        .enum([
          'TICKETS_NOT_RECEIVED',
          'CHANGE_OF_TRAVEL_PLANS',
          'MODIFY_EXISTING_RESERVATION',
          'FOUND_CHEAPER_OPTION_ELSEWHERE',
          'OTHER'
        ])
        .describe('Reason for requesting cancellation'),
      comment: z
        .string()
        .optional()
        .describe('Additional information for the cancellation request')
    })
  )
  .output(
    z.object({
      bookingId: z.string(),
      success: z
        .boolean()
        .describe('Whether Headout accepted the cancellation request for processing'),
      message: z.string().optional().describe('Provider acknowledgement'),
      raw: z.unknown().optional().describe('Complete provider acknowledgement')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, ...ctx.config });
    let result = await client.cancelBooking(ctx.input.bookingId, {
      reason: ctx.input.reason,
      comment: ctx.input.comment
    });
    if (result.success !== true) {
      throw createApiServiceError(
        `Headout did not accept the cancellation request: ${result.message ?? 'No successful acknowledgement was returned.'}`,
        { reason: 'headout_cancellation_rejected' }
      );
    }
    return {
      output: {
        bookingId: ctx.input.bookingId,
        success: true,
        message: result.message ?? undefined,
        raw: result
      },
      message: `Cancellation request submitted for booking **${ctx.input.bookingId}**. Use get_booking to check the final outcome.`
    };
  })
  .build();
