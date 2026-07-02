import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let createBooking = SlateTool.create(spec, {
  name: 'Create Booking',
  key: 'create_booking',
  description: `Creates a new booking for a rental unit/product. Processes the booking with the specified dates, occupancy, and optional coupon codes. Returns the booking ID, reference, and payment URL if payment is required.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      productId: z.string().describe('UUID of the product (rental unit) to book'),
      startDate: z.string().describe('Start date of the booking in YYYY-MM-DD format'),
      endDate: z.string().describe('End date of the booking in YYYY-MM-DD format'),
      occupancy: z
        .record(z.string(), z.number())
        .describe('Maps capacity group IDs to guest counts'),
      couponCodes: z.array(z.string()).optional().describe('Discount coupon codes to apply'),
      currency: z.string().optional().describe('Override the product default currency'),
      formValues: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom form field responses keyed by service ID'),
      language: z.string().optional().describe('Preferred language for the booking'),
      redirectUrl: z
        .string()
        .optional()
        .describe('URL to redirect to after payment completion')
    })
  )
  .output(
    z.object({
      bookingId: z.string().describe('UUID of the created booking'),
      reference: z.string().describe('Public reference for the customer'),
      paymentUrl: z
        .string()
        .nullable()
        .describe('Payment redirect URL, or null if no payment required')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);

    let result = await client.createBooking({
      productId: ctx.input.productId,
      interval: { start: ctx.input.startDate, end: ctx.input.endDate },
      occupancy: ctx.input.occupancy,
      couponCodes: ctx.input.couponCodes,
      currency: ctx.input.currency,
      formValues: ctx.input.formValues,
      language: ctx.input.language,
      redirectUrl: ctx.input.redirectUrl
    });

    return {
      output: {
        bookingId: result.booking_id,
        reference: result.reference,
        paymentUrl: result.payment_url ?? null
      },
      message: `Booking created successfully with reference **${result.reference}**.${result.payment_url ? ` Payment required: ${result.payment_url}` : ' No payment required.'}`
    };
  })
  .build();
