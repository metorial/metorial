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

export let updateSaleQuote = SlateTool.create(spec, {
  name: 'Update Sale Quote',
  key: 'update_sale_quote',
  description: `Update an existing sales quote in Altoviz.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      quoteId: z.number().describe('Altoviz quote ID'),
      customerId: z.number().optional(),
      customerNumber: z.string().optional(),
      date: z.string().optional(),
      headerNotes: z.string().optional(),
      footerNotes: z.string().optional(),
      lines: z.array(lineItemSchema).optional(),
      metadata: z.record(z.string(), z.any()).optional()
    })
  )
  .output(
    z.object({
      quoteId: z.number(),
      number: z.string().nullable().optional(),
      date: z.string().nullable().optional(),
      taxExcludedAmount: z.number().nullable().optional(),
      taxIncludedAmount: z.number().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { quoteId, ...updateData } = ctx.input;
    let result = await client.updateSaleQuote(quoteId, updateData);

    return {
      output: {
        quoteId: result.id,
        number: result.number,
        date: result.date,
        taxExcludedAmount: result.taxExcludedAmount,
        taxIncludedAmount: result.taxIncludedAmount
      },
      message: `Updated quote **${result.number || result.id}**.`
    };
  })
  .build();
