import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

let paymentSchema = z.object({
  paymentId: z.string().describe('UUID of the payment'),
  bookingId: z.string().describe('UUID of the related booking'),
  invoiceId: z.string().describe('UUID of the associated invoice'),
  amount: z.number().describe('Total payment amount'),
  paid: z.number().describe('Amount already paid'),
  currency: z.string().describe('Payment currency'),
  status: z.string().describe('Current payment status'),
  offline: z.boolean().describe('Whether this is an offline payment'),
  reference: z.string().describe('Payment reference'),
  dueAt: z.string().nullable().describe('Payment due date'),
  completedAt: z.string().nullable().describe('Completion timestamp'),
  createdAt: z.string().describe('Creation timestamp')
});

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `Lists payments with optional filtering and pagination. Filter by booking, invoice, status, or other fields.`,
  constraints: ['Maximum 1000 results per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      bookingId: z.string().optional().describe('Filter by booking UUID'),
      invoiceId: z.string().optional().describe('Filter by invoice UUID'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional PostgREST-style filters'),
      order: z.string().optional().describe('Sort order'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      payments: z.array(paymentSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let filters = { ...ctx.input.filters };
    if (ctx.input.bookingId) filters.booking_id = `eq.${ctx.input.bookingId}`;
    if (ctx.input.invoiceId) filters.invoice_id = `eq.${ctx.input.invoiceId}`;

    let payments = await client.listPayments({
      select:
        'id,booking_id,invoice_id,amount,paid,currency,status,offline,reference,due_at,completed_at,created_at',
      filters,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = (payments || []).map((p: any) => ({
      paymentId: p.id,
      bookingId: p.booking_id,
      invoiceId: p.invoice_id,
      amount: p.amount,
      paid: p.paid,
      currency: p.currency,
      status: p.status,
      offline: p.offline,
      reference: p.reference,
      dueAt: p.due_at ?? null,
      completedAt: p.completed_at ?? null,
      createdAt: p.created_at
    }));

    return {
      output: { payments: mapped },
      message: `Found **${mapped.length}** payment(s).`
    };
  })
  .build();
