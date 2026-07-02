import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  description: z.string().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  vatId: z.number().optional(),
  productNumber: z.string().optional(),
  discount: z.number().optional(),
  unit: z.string().optional()
});

export let updateSaleInvoice = SlateTool.create(spec, {
  name: 'Update Sale Invoice',
  key: 'update_sale_invoice',
  description: `Update an existing sales invoice in Altoviz. Only draft invoices can be updated. Finalized invoices cannot be modified.`,
  constraints: ['Only draft invoices can be updated.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      invoiceId: z.number().describe('Altoviz invoice ID'),
      customerId: z.number().optional(),
      customerNumber: z.string().optional(),
      date: z.string().optional().describe('Invoice date (YYYY-MM-DD)'),
      headerNotes: z.string().optional(),
      footerNotes: z.string().optional(),
      lines: z.array(lineItemSchema).optional(),
      metadata: z.record(z.string(), z.any()).optional()
    })
  )
  .output(
    z.object({
      invoiceId: z.number(),
      number: z.string().nullable().optional(),
      date: z.string().nullable().optional(),
      taxExcludedAmount: z.number().nullable().optional(),
      taxIncludedAmount: z.number().nullable().optional(),
      status: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { invoiceId, ...updateData } = ctx.input;
    let result = await client.updateSaleInvoice(invoiceId, updateData);

    return {
      output: {
        invoiceId: result.id,
        number: result.number,
        date: result.date,
        taxExcludedAmount: result.taxExcludedAmount,
        taxIncludedAmount: result.taxIncludedAmount,
        status: result.status
      },
      message: `Updated invoice **${result.number || result.id}**.`
    };
  })
  .build();
