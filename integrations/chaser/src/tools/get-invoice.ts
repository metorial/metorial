import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invoiceOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve a single invoice by its internal Chaser ID or external ID. Returns full invoice details including amounts, dates, status, payment history, and attached PDF link.`,
  instructions: [
    'Use the internal Chaser invoice ID directly, or prefix the external invoice ID with "ext_" (e.g. "ext_INV-001").'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('Internal Chaser invoice ID or "ext_{invoiceId}"')
    })
  )
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getInvoice(ctx.input.invoiceId);

    return {
      output: {
        invoiceInternalId: result.id || '',
        invoiceId: result.invoiceId || '',
        invoiceNumber: result.invoiceNumber || '',
        status: result.status || '',
        currencyCode: result.currencyCode || '',
        amountDue: result.amountDue ?? 0,
        amountPaid: result.amountPaid ?? 0,
        total: result.total ?? 0,
        subTotal: result.subTotal ?? null,
        date: result.date || '',
        dueDate: result.dueDate || '',
        fullyPaidDate: result.fullyPaidDate ?? null,
        customerExternalId: result.customerExternalId || '',
        customerName: result.customerName ?? null,
        payments: result.payments,
        invoicePdfLink: result.invoicePdfLink ?? null,
        invoicePdfLinkUpdatedAt: result.invoicePdfLinkUpdatedAt ?? null
      },
      message: `Retrieved invoice **${result.invoiceNumber}** (${result.invoiceId}), status: ${result.status}, amount due: ${result.amountDue} ${result.currencyCode}.`
    };
  })
  .build();
