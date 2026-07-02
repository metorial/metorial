import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve detailed information about a specific invoice. Optionally include invoice line items and associated files.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      invoiceId: z.number().describe('The ID of the invoice'),
      includeLines: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include invoice line items'),
      includePayments: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include payment records')
    })
  )
  .output(
    z.object({
      invoiceId: z.number(),
      number: z.string().optional(),
      subject: z.string().optional(),
      contact: z.string().optional(),
      project: z.string().optional(),
      date: z.string().optional(),
      dueDate: z.string().optional(),
      totalExclVat: z.number().optional(),
      totalInclVat: z.number().optional(),
      status: z.string().optional(),
      paymentDate: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      lines: z.array(z.record(z.string(), z.any())).optional(),
      payments: z.array(z.record(z.string(), z.any())).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.get('invoices', ctx.input.invoiceId);
    let i = result.data as any;

    let output: any = {
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
    };

    if (ctx.input.includeLines) {
      let lines = await client.listNested('invoices', ctx.input.invoiceId, 'invoicelines');
      output.lines = lines.data;
    }

    if (ctx.input.includePayments) {
      let payments = await client.listNested('invoices', ctx.input.invoiceId, 'payments');
      output.payments = payments.data;
    }

    return {
      output,
      message: `Retrieved invoice **${output.number || output.invoiceId}**${output.subject ? ` — ${output.subject}` : ''}.`
    };
  })
  .build();
