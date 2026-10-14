import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let voidInvoice = SlateTool.create(spec, {
  name: 'Void Invoice',
  key: 'void_invoice',
  description: `Set the void status of an issued invoice. Voided invoices remain for record-keeping but are excluded from reports and balances. Can also un-void a previously voided invoice.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      invoiceId: z.string().describe('The unique ID of the invoice to void or un-void.'),
      void: z.boolean().optional().describe('True to void (default), false to un-void.')
    })
  )
  .output(
    z.object({
      invoice: z.any().describe('The updated invoice object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.input.organizationId ?? ctx.config.organizationId
    });

    let invoice = await client.voidInvoice(ctx.input.invoiceId, ctx.input.void ?? true);

    let status = (ctx.input.void ?? true) ? 'voided' : 'un-voided';
    return {
      output: { invoice },
      message: `Invoice **${invoice.sequence_flat || invoice.id}** has been ${status}.`
    };
  })
  .build();
