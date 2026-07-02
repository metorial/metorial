import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInvoiceTool = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve detailed information about a specific invoice including line items, payment history, and state. Optionally include related data like custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('The invoice ID'),
      include: z
        .string()
        .optional()
        .describe('Comma-separated list of related data to include')
    })
  )
  .output(
    z.object({
      invoice: z.record(z.string(), z.any()).describe('Invoice details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let invoice = await client.getInvoice(ctx.input.invoiceId, ctx.input.include);

    return {
      output: { invoice },
      message: `Retrieved invoice **${invoice.number || invoice._id}** (state: ${invoice.state || 'unknown'}).`
    };
  })
  .build();
