import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let invoiceSchema = z.object({
  invoiceId: z.number().describe('Unique invoice ID'),
  number: z.string().optional().describe('Invoice number'),
  subject: z.string().optional().describe('Invoice subject'),
  contact: z.string().optional().describe('Contact reference'),
  project: z.string().optional().describe('Project reference'),
  date: z.string().optional().describe('Invoice date'),
  dueDate: z.string().optional().describe('Payment due date'),
  totalExclVat: z.number().optional().describe('Total amount excluding VAT'),
  totalInclVat: z.number().optional().describe('Total amount including VAT'),
  status: z.string().optional().describe('Invoice status'),
  paymentDate: z.string().optional().describe('Date payment was received'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Retrieve a list of invoices from Rentman. Browse all invoices with their amounts, contacts, and payment status.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().default(25).describe('Maximum number of results (max 300)'),
      offset: z.number().optional().default(0).describe('Number of results to skip'),
      sort: z.string().optional().describe('Sort field with + or - prefix'),
      fields: z.string().optional().describe('Comma-separated fields to return')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSchema),
      itemCount: z.number(),
      limit: z.number(),
      offset: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.list('invoices', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      fields: ctx.input.fields
    });

    let invoices = result.data.map((i: any) => ({
      invoiceId: i.id,
      number: i.number,
      subject: i.subject,
      contact: i.contact,
      project: i.project,
      date: i.date,
      dueDate: i.due_date,
      totalExclVat: i.total_excl_vat,
      totalInclVat: i.total_incl_vat,
      status: i.status,
      paymentDate: i.payment_date,
      createdAt: i.created,
      updatedAt: i.modified
    }));

    return {
      output: {
        invoices,
        itemCount: result.itemCount,
        limit: result.limit,
        offset: result.offset
      },
      message: `Found **${result.itemCount}** invoices. Returned ${invoices.length} invoices (offset: ${result.offset}).`
    };
  })
  .build();
