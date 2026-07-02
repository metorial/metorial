import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let updateBooking = SlateTool.create(spec, {
  name: 'Update Booking',
  key: 'update_booking',
  description: `Updates an existing booking. Supports modifying currency, display currency, and silent status.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      bookingId: z.string().describe('UUID of the booking to update'),
      currency: z.string().optional().describe('New booking currency'),
      displayCurrency: z.string().optional().describe('New display currency'),
      silent: z.boolean().optional().describe('Whether to suppress confirmation emails')
    })
  )
  .output(
    z.object({
      bookingId: z.string().describe('UUID of the updated booking'),
      reference: z.string().describe('Public-facing booking reference'),
      currency: z.string().describe('Updated currency'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);

    let patchData: Record<string, any> = {};
    if (ctx.input.currency !== undefined) patchData.currency = ctx.input.currency;
    if (ctx.input.displayCurrency !== undefined)
      patchData.display_currency = ctx.input.displayCurrency;
    if (ctx.input.silent !== undefined) patchData.silent = ctx.input.silent;

    let result = await client.updateBooking(ctx.input.bookingId, patchData);

    return {
      output: {
        bookingId: result.id,
        reference: result.reference,
        currency: result.currency,
        updatedAt: result.updated_at
      },
      message: `Booking **${result.reference}** updated successfully.`
    };
  })
  .build();
