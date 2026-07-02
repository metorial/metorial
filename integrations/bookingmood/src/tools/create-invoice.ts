import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Creates a new invoice for a booking. Associate it with a booking ID and optionally provide a reference and attachment.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      bookingId: z.string().optional().describe('UUID of the associated booking'),
      reference: z.string().optional().describe('Invoice reference identifier'),
      attachment: z.string().optional().describe('Attachment URL or data')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('UUID of the created invoice'),
      bookingId: z.string().nullable().describe('UUID of the associated booking'),
      reference: z.string().describe('Invoice reference'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);

    let data: Record<string, any> = {};
    if (ctx.input.bookingId !== undefined) data.booking_id = ctx.input.bookingId;
    if (ctx.input.reference !== undefined) data.reference = ctx.input.reference;
    if (ctx.input.attachment !== undefined) data.attachment = ctx.input.attachment;

    let result = await client.createInvoice(data);

    return {
      output: {
        invoiceId: result.id,
        bookingId: result.booking_id ?? null,
        reference: result.reference,
        createdAt: result.created_at
      },
      message: `Invoice **${result.reference}** created successfully.`
    };
  })
  .build();
