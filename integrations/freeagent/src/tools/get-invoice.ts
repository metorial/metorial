import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve a single invoice by ID with full details including line items, status, and payment information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('The FreeAgent invoice ID')
    })
  )
  .output(
    z.object({
      invoice: z.record(z.string(), z.any()).describe('The full invoice record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let invoice = await client.getInvoice(ctx.input.invoiceId);

    return {
      output: { invoice },
      message: `Retrieved invoice **${invoice.reference || ctx.input.invoiceId}** (status: ${invoice.status})`
    };
  })
  .build();
