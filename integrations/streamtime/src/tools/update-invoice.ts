import { createApiServiceError, SlateTool } from 'slates';
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
      name: z.string().optional().describe('Updated invoice name/title'),
      reference: z
        .string()
        .optional()
        .describe('Updated reference shown on the invoice. Alternative to poNumber.'),
      invoiceDate: z.string().optional().describe('Updated invoice date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Updated due date (YYYY-MM-DD)'),
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

    if (ctx.input.poNumber !== undefined && ctx.input.reference !== undefined) {
      throw createApiServiceError(
        'Provide poNumber or reference for the invoice reference, not both.'
      );
    }
    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.reference !== undefined) body.reference = ctx.input.reference;
    if (ctx.input.invoiceDate !== undefined) body.invoiceDate = ctx.input.invoiceDate;
    if (ctx.input.dueDate !== undefined) body.dueDate = ctx.input.dueDate;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.discount !== undefined) body.discount = ctx.input.discount;
    if (ctx.input.poNumber !== undefined) body.reference = ctx.input.poNumber;
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
