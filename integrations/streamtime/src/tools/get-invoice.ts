import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieve an invoice by its ID, including all details. Optionally also fetches line items, tracked line items, and payments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('ID of the invoice to retrieve'),
      includeLineItems: z.boolean().optional().describe('Also fetch the invoice line items'),
      includeTrackedLineItems: z
        .boolean()
        .optional()
        .describe('Also fetch the tracked line items'),
      includePayments: z.boolean().optional().describe('Also fetch the invoice payments')
    })
  )
  .output(
    z.object({
      invoiceId: z.number().describe('ID of the invoice'),
      raw: z.record(z.string(), z.any()).describe('Full invoice object'),
      lineItems: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Invoice line items if requested'),
      trackedLineItems: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Tracked line items if requested'),
      payments: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Invoice payments if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let invoice = await client.getInvoice(ctx.input.invoiceId);

    let output: Record<string, any> = {
      invoiceId: invoice.id,
      raw: invoice
    };

    if (ctx.input.includeLineItems) {
      output.lineItems = await client.listInvoiceLineItems(ctx.input.invoiceId);
    }
    if (ctx.input.includeTrackedLineItems) {
      output.trackedLineItems = await client.listInvoiceTrackedLineItems(ctx.input.invoiceId);
    }
    if (ctx.input.includePayments) {
      output.payments = await client.listInvoicePayments(ctx.input.invoiceId);
    }

    return {
      output: output as any,
      message: `Retrieved invoice (ID: ${invoice.id}).`
    };
  })
  .build();
