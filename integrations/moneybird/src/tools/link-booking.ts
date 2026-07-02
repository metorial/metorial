import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

export let linkBooking = SlateTool.create(spec, {
  name: 'Link Financial Mutation',
  key: 'link_booking',
  description: `Link a financial mutation (bank transaction) to an invoice, document, or ledger account for bookkeeping reconciliation. Can also unlink an existing booking.`,
  instructions: [
    'For linking, provide mutationId, bookingType, and bookingId.',
    'For unlinking, set "unlink" to true and provide the bookingType and bookingId to remove.',
    'bookingType must match the Moneybird type: SalesInvoice, Document, LedgerAccount, ExternalSalesInvoice, etc.'
  ]
})
  .input(
    z.object({
      mutationId: z.string().describe('Financial mutation ID'),
      unlink: z.boolean().optional().describe('Set to true to unlink instead of link'),
      bookingType: z
        .enum([
          'SalesInvoice',
          'Document',
          'LedgerAccount',
          'ExternalSalesInvoice',
          'Payment',
          'LedgerAccountBooking'
        ])
        .describe('Type of entity to link/unlink'),
      bookingId: z.string().describe('ID of the entity to link/unlink'),
      price: z.string().optional().describe('Amount to book (if partial)'),
      description: z
        .string()
        .optional()
        .describe('Booking description (for LedgerAccount linking)'),
      projectId: z.string().optional().describe('Project ID to associate')
    })
  )
  .output(
    z.object({
      mutationId: z.string(),
      linked: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    if (ctx.input.unlink) {
      await client.unlinkBooking(ctx.input.mutationId, {
        booking_type: ctx.input.bookingType,
        booking_id: ctx.input.bookingId
      });
      return {
        output: { mutationId: ctx.input.mutationId, linked: false },
        message: `Unlinked ${ctx.input.bookingType} ${ctx.input.bookingId} from mutation ${ctx.input.mutationId}.`
      };
    }

    let bookingData: Record<string, any> = {
      booking_type: ctx.input.bookingType,
      booking_id: ctx.input.bookingId
    };
    if (ctx.input.price) bookingData.price = ctx.input.price;
    if (ctx.input.description) bookingData.description = ctx.input.description;
    if (ctx.input.projectId) bookingData.project_id = ctx.input.projectId;

    await client.linkBooking(ctx.input.mutationId, bookingData);

    return {
      output: { mutationId: ctx.input.mutationId, linked: true },
      message: `Linked ${ctx.input.bookingType} ${ctx.input.bookingId} to mutation ${ctx.input.mutationId}.`
    };
  });
