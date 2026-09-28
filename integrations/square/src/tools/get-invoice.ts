import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';
import { invoiceOutputSchema, mapInvoice } from './invoice-shared';

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description:
    'Get an invoice by ID, including its current version, payment schedule, recipient, status, and customer payment URL when published.',
  tags: { readOnly: true }
})
  .scopes(allOf('INVOICES_READ'))
  .input(z.object({ invoiceId: z.string().describe('Invoice ID') }))
  .output(invoiceOutputSchema)
  .handleInvocation(async ctx => {
    let invoice = await createClient(ctx.auth).getInvoice(ctx.input.invoiceId);
    return {
      output: mapInvoice(invoice),
      message: `Invoice **${invoice.id}** — Status: **${invoice.status}**, version **${invoice.version}**.`
    };
  })
  .build();
