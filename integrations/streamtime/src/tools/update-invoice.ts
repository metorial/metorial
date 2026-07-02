import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let updateInvoice = SlateTool.create(spec, {
  name: 'Update Invoice',
  key: 'update_invoice',
  description: `Update an existing invoice's details. You can modify descriptions, labels, discount, payment terms, and other metadata.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('ID of the invoice to update'),
      description: z.string().optional().describe('Updated description'),
      discount: z.number().optional().describe('Discount amount or percentage'),
      poNumber: z.string().optional().describe('Purchase order number'),
      paymentTerms: z.string().optional().describe('Payment terms text')
    })
  )
  .output(
    z.object({
      invoiceId: z.number().describe('ID of the updated invoice'),
      raw: z.record(z.string(), z.any()).describe('Full updated invoice object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.discount !== undefined) body.discount = ctx.input.discount;
    if (ctx.input.poNumber !== undefined) body.poNumber = ctx.input.poNumber;
    if (ctx.input.paymentTerms !== undefined) body.paymentTerms = ctx.input.paymentTerms;

    let result = await client.updateInvoice(ctx.input.invoiceId, body);

    return {
      output: {
        invoiceId: result.id,
        raw: result
      },
      message: `Updated invoice (ID: ${result.id}).`
    };
  })
  .build();
