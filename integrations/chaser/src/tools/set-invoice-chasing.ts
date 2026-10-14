import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let setInvoiceChasing = SlateTool.create(spec, {
  name: 'Pause or Resume Invoice Chasing',
  key: 'set_invoice_chasing',
  description:
    'Pause or resume payment reminders for a single invoice. Pausing stops chasing this invoice until invoice chasing is resumed.',
  instructions: [
    'Use list_invoices or get_invoice to discover the invoice. Use its internal ID or prefix its external invoice ID with "ext_".'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      invoiceId: z.string().describe('Internal invoice ID or "ext_{invoiceId}"'),
      action: z.enum(['pause', 'resume']).describe('Pause or resume invoice chasing')
    })
  )
  .output(
    z.object({
      invoiceInternalId: z.string().describe('Internal Chaser invoice ID'),
      chasing: z.boolean().describe('Whether chasing is enabled for the invoice')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.setInvoiceChasing(ctx.input.invoiceId, ctx.input.action);
    return {
      output: { invoiceInternalId: result.id, chasing: result.chasing },
      message: `Invoice chasing is ${result.chasing ? 'enabled' : 'paused'} for ${result.id}.`
    };
  })
  .build();
