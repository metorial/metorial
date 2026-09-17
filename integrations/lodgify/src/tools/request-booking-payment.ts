import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let requestBookingPayment = SlateTool.create(spec, {
  name: 'Request Booking Payment',
  key: 'request_booking_payment',
  description: `Email the guest a payment request for a booking. The amount is taken from the booking's existing quote and payment schedule and cannot be set here, so make sure the booking has the quote you intend to charge before sending the request.`,
  instructions: [
    'Review the booking quote first if the amount matters, since the guest is asked for whatever the existing quote and payment schedule specify.',
    'To charge a specific amount instead, create a payment link for that amount rather than using this tool.'
  ],
  constraints: [
    "The amount cannot be chosen when sending the request; it always comes from the booking's current quote and payment schedule.",
    'Only bookings can be sent a payment request. Upgrade an enquiry to a booking first.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bookingId: z
        .number()
        .describe('The ID of the booking to send the guest a payment request for')
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe('Whether the payment request was accepted and sent to the guest'),
      bookingId: z.number().describe('The booking the payment request was sent for')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.requestBookingPayment(ctx.input.bookingId);

    return {
      output: {
        success: true,
        bookingId: ctx.input.bookingId
      },
      message: `Emailed the guest a payment request for booking **#${ctx.input.bookingId}**, for the amount in its current quote and payment schedule.`
    };
  })
  .build();
