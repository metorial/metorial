import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invoiceInputSchema, invoiceOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

let mapInvoiceOutput = (data: any) => ({
  invoiceInternalId: data.id || '',
  invoiceId: data.invoiceId || '',
  invoiceNumber: data.invoiceNumber || '',
  status: data.status || '',
  currencyCode: data.currencyCode || '',
  amountDue: data.amountDue ?? 0,
  amountPaid: data.amountPaid ?? 0,
  total: data.total ?? 0,
  subTotal: data.subTotal ?? null,
  date: data.date || '',
  dueDate: data.dueDate || '',
  fullyPaidDate: data.fullyPaidDate ?? null,
  customerExternalId: data.customerExternalId || '',
  customerName: data.customerName ?? null,
  payments: data.payments,
  invoicePdfLink: data.invoicePdfLink ?? null,
  invoicePdfLinkUpdatedAt: data.invoicePdfLinkUpdatedAt ?? null
});

export let upsertInvoice = SlateTool.create(spec, {
  name: 'Create or Update Invoice',
  key: 'upsert_invoice',
  description: `Create a new invoice or update an existing one in Chaser. Invoices track amounts due, payment status, and due dates. The associated customer must exist before creating an invoice.`,
  instructions: [
    'To update an existing invoice, provide the invoiceInternalId (Chaser internal ID) or use "ext_{invoiceId}" format.',
    'When creating, all fields in the invoice object are required: invoiceId, invoiceNumber, status, currencyCode, amountDue, amountPaid, total, date, dueDate, and customerExternalId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceInternalId: z
        .string()
        .optional()
        .describe(
          'Internal Chaser invoice ID or "ext_{invoiceId}" for updates. Omit to create.'
        ),
      invoice: invoiceInputSchema.describe('Invoice data')
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.invoiceInternalId) {
      result = await client.updateInvoice(ctx.input.invoiceInternalId, ctx.input.invoice);
    } else {
      result = await client.createInvoice(ctx.input.invoice);
    }

    let output = mapInvoiceOutput(result);
    let action = ctx.input.invoiceInternalId ? 'Updated' : 'Created';
    return {
      output,
      message: `${action} invoice **${output.invoiceNumber}** (${output.invoiceId}) for customer ${output.customerExternalId}.`
    };
  })
  .build();
