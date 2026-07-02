import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Retrieve billing invoices from Deel for accounting and financial integration. Returns invoice details including amounts, dates, and statuses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of results to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      invoices: z.array(z.record(z.string(), z.any())).describe('List of invoices')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result = await client.listInvoices(params);
    let invoices = result?.data ?? [];

    return {
      output: { invoices },
      message: `Found ${invoices.length} invoice(s).`
    };
  })
  .build();
