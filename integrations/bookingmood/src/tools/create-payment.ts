import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let createPayment = SlateTool.create(spec, {
  name: 'Create Payment',
  key: 'create_payment',
  description: `Creates a new payment record for a booking/invoice. Specify the amount, currency, due date, and whether it is an offline payment.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      bookingId: z.string().describe('UUID of the associated booking'),
      invoiceId: z.string().describe('UUID of the associated invoice'),
      amount: z.number().describe('Total payment amount in minor units'),
      currency: z.string().describe('Payment currency code'),
      dueAt: z.string().optional().describe('Payment due date (ISO timestamp)'),
      offline: z.boolean().optional().describe('Whether this is an offline payment')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('UUID of the created payment'),
      bookingId: z.string().describe('UUID of the booking'),
      amount: z.number().describe('Payment amount'),
      currency: z.string().describe('Payment currency'),
      status: z.string().describe('Payment status'),
      reference: z.string().describe('Payment reference'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);

    let data: Record<string, any> = {
      booking_id: ctx.input.bookingId,
      invoice_id: ctx.input.invoiceId,
      amount: ctx.input.amount,
      currency: ctx.input.currency
    };
    if (ctx.input.dueAt !== undefined) data.due_at = ctx.input.dueAt;
    if (ctx.input.offline !== undefined) data.offline = ctx.input.offline;

    let result = await client.createPayment(data);

    return {
      output: {
        paymentId: result.id,
        bookingId: result.booking_id,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
        reference: result.reference,
        createdAt: result.created_at
      },
      message: `Payment **${result.reference}** created for ${result.amount} ${result.currency}.`
    };
  })
  .build();
