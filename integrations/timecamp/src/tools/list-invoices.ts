import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Retrieve all invoices from TimeCamp. Returns invoice details including client association, status, amount, and currency.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      invoices: z.array(
        z.object({
          invoiceId: z.string().describe('Invoice ID'),
          clientId: z.string().describe('Associated client ID'),
          status: z.string().describe('Invoice status'),
          amount: z.string().describe('Invoice amount'),
          currency: z.string().describe('Currency code'),
          date: z.string().describe('Invoice date')
        })
      ),
      totalInvoices: z.number().describe('Total number of invoices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let invoices = await client.getInvoices();
    let mapped = invoices.map(invoice => ({
      invoiceId: String(invoice.invoiceId ?? invoice.invoice_id ?? invoice.id ?? ''),
      clientId: String(invoice.client_id ?? ''),
      status: String(invoice.status ?? ''),
      amount: String(invoice.amount ?? '0'),
      currency: String(invoice.currency ?? ''),
      date: String(invoice.date ?? '')
    }));

    return {
      output: {
        invoices: mapped,
        totalInvoices: mapped.length
      },
      message: `Retrieved **${mapped.length}** invoices.`
    };
  })
  .build();
