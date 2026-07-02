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

    let rawInvoices = await client.getInvoices();

    let invoiceList: any[] = [];
    if (Array.isArray(rawInvoices)) {
      invoiceList = rawInvoices;
    } else if (rawInvoices && typeof rawInvoices === 'object') {
      invoiceList = Object.values(rawInvoices);
    }

    let mapped = invoiceList.map((inv: any) => ({
      invoiceId: String(inv.invoiceId || inv.invoice_id || inv.id || ''),
      clientId: String(inv.client_id || ''),
      status: String(inv.status || ''),
      amount: String(inv.amount || '0'),
      currency: String(inv.currency || ''),
      date: String(inv.date || '')
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
