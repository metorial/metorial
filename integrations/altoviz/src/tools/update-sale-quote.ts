import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  taxExcludedPrice: z
    .number()
    .optional()
    .describe('Unit price excluding tax; takes precedence over unitPrice'),
  taxIncludedPrice: z.number().optional().describe('Unit price including tax'),
  productId: z.number().optional(),
  productInternalId: z.string().optional(),
  classificationId: z
    .number()
    .optional()
    .describe('Classification ID from get_settings when not using a product'),
  discountType: z
    .enum(['Percent', 'Fixed'])
    .optional()
    .describe('How numeric discount is interpreted; defaults to Percent'),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  vatId: z.number().optional(),
  productNumber: z.string().optional(),
  discount: z.number().optional(),
  unit: z.string().optional().describe('Unit code from get_settings with includeUnits')
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
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete provider response, including fields not shown in the summary'),
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
        raw: result,
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
