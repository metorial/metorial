import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let createRefund = SlateTool.create(spec, {
  name: 'Create Refund',
  key: 'create_refund',
  description: `Creates a refund for a booking/invoice. Specify the amount, currency, and optionally a comment explaining the reason.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      bookingId: z.string().describe('UUID of the associated booking'),
      invoiceId: z.string().describe('UUID of the associated invoice'),
      amount: z.number().describe('Refund amount in minor units'),
      currency: z.string().describe('Refund currency code'),
      comment: z.string().optional().describe('Reason or note for the refund'),
      dueAt: z.string().optional().describe('When the refund is due (ISO timestamp)')
    })
  )
  .output(
    z.object({
      refundId: z.string().describe('UUID of the created refund'),
      bookingId: z.string().describe('UUID of the booking'),
      amount: z.number().describe('Refund amount'),
      currency: z.string().describe('Refund currency'),
      status: z.string().describe('Refund status'),
      reference: z.string().describe('Refund reference'),
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
    if (ctx.input.comment !== undefined) data.comment = ctx.input.comment;
    if (ctx.input.dueAt !== undefined) data.due_at = ctx.input.dueAt;

    let result = await client.createRefund(data);

    return {
      output: {
        refundId: result.id,
        bookingId: result.booking_id,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
        reference: result.reference,
        createdAt: result.created_at
      },
      message: `Refund **${result.reference}** created for ${result.amount} ${result.currency}.`
    };
  })
  .build();
