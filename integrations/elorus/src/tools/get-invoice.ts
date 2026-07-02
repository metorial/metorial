import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve full details of a specific invoice, including line items, totals, payment status, and client information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('The unique ID of the invoice to retrieve.')
    })
  )
  .output(
    z.object({
      invoice: z.any().describe('The full invoice object with all details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let invoice = await client.getInvoice(ctx.input.invoiceId);

    return {
      output: { invoice },
      message: `Retrieved invoice **${invoice.sequence_flat || invoice.id}** — Total: ${invoice.total} ${invoice.currency_code || ''}`
    };
  })
  .build();
