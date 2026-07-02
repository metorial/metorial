import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInvoicesTool = SlateTool.create(spec, {
  name: 'Get Invoices',
  key: 'get_invoices',
  description: `Retrieve invoices from AccuLynx. Get all invoices for a job, or fetch details for a specific invoice by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.string().optional().describe('Specific invoice ID to retrieve details for'),
      jobId: z.string().optional().describe('Job ID to retrieve invoices for')
    })
  )
  .output(
    z.object({
      invoice: z.record(z.string(), z.any()).optional().describe('Single invoice details'),
      invoices: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of invoice objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.invoiceId) {
      let invoice = await client.getInvoice(ctx.input.invoiceId);
      return {
        output: { invoice },
        message: `Retrieved invoice **${ctx.input.invoiceId}**.`
      };
    }

    if (ctx.input.jobId) {
      let result = await client.getJobInvoices(ctx.input.jobId);
      let invoices = Array.isArray(result) ? result : (result?.items ?? result?.data ?? []);
      return {
        output: { invoices },
        message: `Retrieved **${invoices.length}** invoice(s) for job **${ctx.input.jobId}**.`
      };
    }

    return {
      output: { invoices: [] },
      message: 'Please provide either an invoiceId or jobId to retrieve invoices.'
    };
  })
  .build();
