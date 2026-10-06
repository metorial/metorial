import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { administrationIdSchema } from '../lib/schemas';
import { checkedOutput, validateToolInput } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  mutationId: z.string(),
  linked: z.boolean()
});

export let linkBooking = SlateTool.create(spec, {
  name: 'Link Financial Mutation',
  key: 'link_booking',
  description: `Link a financial mutation (bank transaction) to an invoice, document, or ledger account for bookkeeping reconciliation. Can also unlink an existing booking. Call list_administrations to choose administrationId when no default is saved.`,
  instructions: [
    'For linking, provide mutationId, bookingType, and bookingId.',
    'For unlinking, set "unlink" to true and provide the bookingType and bookingId to remove.',
    'bookingType must match the Moneybird type: SalesInvoice, Document, LedgerAccount, ExternalSalesInvoice or Payment for linking; Payment or LedgerAccountBooking for unlinking. Payment linking uses its existing amount.'
  ]
})
  .input(
    z.object({
      administrationId: administrationIdSchema,
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
      price: z
        .string()
        .optional()
        .describe(
          'Exact amount in the invoice currency. For LedgerAccount, this legacy field is treated as the base-currency amount.'
        ),
      priceBase: z
        .string()
        .optional()
        .describe(
          'Exact amount in the administration currency. Required for foreign-currency invoice reconciliation and ledger account bookings.'
        ),
      description: z
        .string()
        .optional()
        .describe('Booking description (for LedgerAccount linking)'),
      projectId: z.string().optional().describe('Project ID to associate')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    validateToolInput('link_booking', ctx.input);
    return checkedOutput(outputSchema, async () => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.input.administrationId ?? ctx.config.administrationId
      });

      if (ctx.input.unlink) {
        await client.unlinkBooking(ctx.input.mutationId, {
          booking_type: ctx.input.bookingType,
          booking_id: ctx.input.bookingId
        });
        return {
          output: { mutationId: ctx.input.mutationId, linked: false },
          message: `Moneybird accepted unlinking ${ctx.input.bookingType} ${ctx.input.bookingId} from mutation ${ctx.input.mutationId}.`
        };
      }

      let bookingData: Record<string, any> = {
        booking_type: ctx.input.bookingType,
        booking_id: ctx.input.bookingId
      };
      if (ctx.input.bookingType === 'LedgerAccount')
        bookingData.price_base = ctx.input.priceBase ?? ctx.input.price;
      else {
        if (ctx.input.price !== undefined) bookingData.price = ctx.input.price;
        if (ctx.input.priceBase !== undefined) bookingData.price_base = ctx.input.priceBase;
      }
      if (ctx.input.description) bookingData.description = ctx.input.description;
      if (ctx.input.projectId) bookingData.project_id = ctx.input.projectId;

      await client.linkBooking(ctx.input.mutationId, bookingData);

      return {
        output: { mutationId: ctx.input.mutationId, linked: true },
        message: `Moneybird accepted linking ${ctx.input.bookingType} ${ctx.input.bookingId} to mutation ${ctx.input.mutationId}.`
      };
    });
  })
  .build();
