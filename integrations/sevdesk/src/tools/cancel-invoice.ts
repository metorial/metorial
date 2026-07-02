import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let cancelInvoice = SlateTool.create(spec, {
  name: 'Cancel Invoice',
  key: 'cancel_invoice',
  description: `Cancel an existing invoice in sevDesk. Creates a cancellation invoice and sets the original invoice status to cancelled. This is the GoBD-compliant way to void an invoice.`,
  constraints: [
    'Cannot cancel an invoice that is already cancelled.',
    'Only invoices with status Open (200) or higher can typically be cancelled.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice to cancel')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('ID of the original invoice'),
      cancelled: z.boolean().describe('Whether the invoice was successfully cancelled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });
    await client.cancelInvoice(ctx.input.invoiceId);

    return {
      output: {
        invoiceId: ctx.input.invoiceId,
        cancelled: true
      },
      message: `Cancelled invoice **${ctx.input.invoiceId}**.`
    };
  })
  .build();
