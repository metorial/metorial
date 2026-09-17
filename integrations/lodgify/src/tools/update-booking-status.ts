import { createApiServiceError, getServiceErrorData, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

// Reads the provider's own message off an already-built service error, so the
// upstream detail is quoted once instead of nesting a formatted error inside a
// second one.
let providerDetail = (error: unknown) =>
  getServiceErrorData(error)?.message ??
  (error instanceof Error ? error.message : String(error));

export let updateBookingStatus = SlateTool.create(spec, {
  name: 'Update Booking Status',
  key: 'update_booking_status',
  description: `Change the status of an existing booking. Supports setting a booking to Booked, Open, Declined, or Tentative. This also updates the property's availability calendar accordingly. When confirming a booking you can optionally ask the guest to pay in the same call.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bookingId: z.number().describe('The ID of the booking to update'),
      status: z
        .enum(['booked', 'open', 'declined', 'tentative'])
        .describe('The new status to set for the booking'),
      requestPayment: z
        .boolean()
        .optional()
        .describe(
          'Only applies when status is "booked". When true, sends the guest a payment request email for the amount already determined by the booking\'s quote or payment schedule. No amount can be specified here. Setting this to true with any other status is rejected'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the status update was successful'),
      bookingId: z.number().describe('The ID of the updated booking'),
      status: z.string().describe('The new status that was set'),
      paymentRequested: z
        .boolean()
        .describe('Whether a payment request email was sent to the guest')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let requestPayment = ctx.input.requestPayment === true;

    if (requestPayment && ctx.input.status !== 'booked') {
      throw createApiServiceError(
        `requestPayment only applies when setting a booking to "booked", not "${ctx.input.status}". Set the status to "booked" to request payment, or omit requestPayment.`
      );
    }

    let statusMap = {
      booked: 'book',
      open: 'reopen',
      declined: 'decline',
      tentative: 'tentative'
    } as const;

    let apiStatus = statusMap[ctx.input.status];
    await client.setBookingStatus(ctx.input.bookingId, apiStatus);

    // The status change and the payment request are two separate calls, so the
    // status is already committed once the payment request fails. Reporting the
    // bare provider error would hide that and invite a retry loop that keeps
    // re-sending a status change that already landed.
    if (requestPayment) {
      try {
        await client.requestBookingPayment(ctx.input.bookingId);
      } catch (error) {
        let upstream = getServiceErrorData(error);
        let upstreamStatus = upstream?.upstreamStatus;
        let upstreamCode = upstream?.upstreamCode;

        throw createApiServiceError(
          `Booking #${ctx.input.bookingId} was already changed to "${ctx.input.status}" and that change stands — only the payment request failed. Do not repeat this call with requestPayment true, because it would re-send a status change that already landed and hit the same payment error again. Send the payment request on its own with request_booking_payment once the cause below is resolved, or call this tool again without requestPayment if you only need the status set. ${providerDetail(error)}`,
          {
            reason: 'lodgify_payment_request_failed',
            upstreamStatus:
              typeof upstreamStatus === 'number' || typeof upstreamStatus === 'string'
                ? upstreamStatus
                : undefined,
            upstreamCode: typeof upstreamCode === 'string' ? upstreamCode : undefined,
            parent: error
          }
        );
      }
    }

    let payment = requestPayment ? ' A payment request was sent to the guest.' : '';

    return {
      output: {
        success: true,
        bookingId: ctx.input.bookingId,
        status: ctx.input.status,
        paymentRequested: requestPayment
      },
      message: `Updated booking **#${ctx.input.bookingId}** status to **${ctx.input.status}**.${payment}`
    };
  })
  .build();
