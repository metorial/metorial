import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createInvoice = SlateTool.create(spec, {
  name: 'Create Invoice',
  key: 'create_invoice',
  description: `Create a new invoice in TimeCamp for a client. The invoice can be created from tracked billable time or as a blank template.`
})
  .input(
    z.object({
      clientId: z.number().describe('Client ID to create the invoice for'),
      date: z.string().optional().describe('Invoice date (YYYY-MM-DD)'),
      currencyId: z.number().optional().describe('Currency identifier'),
      note: z.string().optional().describe('Invoice notes')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('ID of the created invoice')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createInvoice({
      clientId: ctx.input.clientId,
      date: ctx.input.date,
      currencyId: ctx.input.currencyId,
      note: ctx.input.note
    });

    let invoiceId = String(result?.invoiceId || result?.invoice_id || result?.id || '');

    return {
      output: {
        invoiceId
      },
      message: `Created invoice **${invoiceId}** for client ${ctx.input.clientId}.`
    };
  })
  .build();
