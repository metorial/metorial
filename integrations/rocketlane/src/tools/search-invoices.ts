import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchInvoices = SlateTool.create(spec, {
  name: 'Search Invoices',
  key: 'search_invoices',
  description: `Searches invoices in Rocketlane with optional filtering by project and status. Returns invoice details including amounts and payment status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().optional().describe('Filter invoices by project ID'),
      status: z.string().optional().describe('Filter invoices by status'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of invoices to return')
    })
  )
  .output(
    z.object({
      invoices: z
        .array(
          z.object({
            invoiceId: z.number().optional().describe('Invoice ID'),
            projectId: z.number().optional().describe('Project ID'),
            status: z.string().optional().describe('Invoice status'),
            amount: z.number().optional().describe('Invoice amount'),
            currency: z.string().optional().describe('Currency code')
          })
        )
        .describe('List of invoices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.searchInvoices({
      projectId: ctx.input.projectId,
      status: ctx.input.status,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let invoices = Array.isArray(result) ? result : (result.invoices ?? result.data ?? []);

    return {
      output: { invoices },
      message: `Found **${invoices.length}** invoice(s).`
    };
  })
  .build();
