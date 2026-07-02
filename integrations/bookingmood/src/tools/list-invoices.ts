import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

let invoiceSchema = z.object({
  invoiceId: z.string().describe('UUID of the invoice'),
  bookingId: z.string().nullable().describe('UUID of the associated booking'),
  organizationId: z.string().describe('UUID of the organization'),
  reference: z.string().describe('Invoice reference identifier'),
  attachment: z.string().nullable().describe('Attachment URL'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Lists invoices with optional filtering and pagination. Filter by booking, reference, or other fields.`,
  constraints: ['Maximum 1000 results per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      bookingId: z.string().optional().describe('Filter by booking UUID'),
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
      invoices: z.array(invoiceSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let filters = { ...ctx.input.filters };
    if (ctx.input.bookingId) filters.booking_id = `eq.${ctx.input.bookingId}`;

    let invoices = await client.listInvoices({
      select: 'id,booking_id,organization_id,reference,attachment,created_at,updated_at',
      filters,
      order: ctx.input.order,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = (invoices || []).map((i: any) => ({
      invoiceId: i.id,
      bookingId: i.booking_id ?? null,
      organizationId: i.organization_id,
      reference: i.reference,
      attachment: i.attachment ?? null,
      createdAt: i.created_at,
      updatedAt: i.updated_at
    }));

    return {
      output: { invoices: mapped },
      message: `Found **${mapped.length}** invoice(s).`
    };
  })
  .build();
