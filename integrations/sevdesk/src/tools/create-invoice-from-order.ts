import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let createInvoiceFromOrder = SlateTool.create(spec, {
  name: 'Create Invoice from Order',
  key: 'create_invoice_from_order',
  description: `Convert an existing order into an invoice. The invoice inherits the order's contact, positions, and other data.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.string().describe('ID of the order to convert to an invoice')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('ID of the created invoice'),
      invoiceNumber: z.string().optional(),
      orderId: z.string().describe('ID of the source order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });
    let result = await client.createInvoiceFromOrder(ctx.input.orderId);
    let invoice = result?.invoice ?? result;

    return {
      output: {
        invoiceId: String(invoice.id),
        invoiceNumber: invoice.invoiceNumber ?? undefined,
        orderId: ctx.input.orderId
      },
      message: `Created invoice **${invoice.invoiceNumber ?? invoice.id}** from order **${ctx.input.orderId}**.`
    };
  })
  .build();
