import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve an invoice by ID, or list invoices with pagination. Returns invoice details including amounts, client, status, and dates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z
        .string()
        .optional()
        .describe('ID of a specific invoice to retrieve. If omitted, lists invoices.'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of invoices per page')
    })
  )
  .output(
    z.object({
      invoices: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of invoice records'),
      totalCount: z.number().optional().describe('Total number of invoices'),
      currentPage: z.number().optional().describe('Current page number'),
      lastPage: z.number().optional().describe('Last page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    if (ctx.input.invoiceId) {
      let result = await client.getInvoice(ctx.input.invoiceId);
      return {
        output: { invoices: [result.data] },
        message: `Retrieved invoice **${result.data.invoice_number ?? ctx.input.invoiceId}**.`
      };
    }

    let result = await client.listInvoices(ctx.input.page, ctx.input.perPage);

    return {
      output: {
        invoices: result.data,
        totalCount: result.meta?.total,
        currentPage: result.meta?.current_page,
        lastPage: result.meta?.last_page
      },
      message: `Retrieved ${result.data.length} invoice(s)${result.meta ? ` (page ${result.meta.current_page} of ${result.meta.last_page})` : ''}.`
    };
  })
  .build();
