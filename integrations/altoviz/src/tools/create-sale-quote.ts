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
  vatId: z.number().optional().describe('VAT rate ID'),
  productNumber: z.string().optional(),
  discount: z.number().optional(),
  unit: z.string().optional().describe('Unit code from get_settings with includeUnits')
});

export let createSaleQuote = SlateTool.create(spec, {
  name: 'Create Sale Quote',
  key: 'create_sale_quote',
  description: `Create a new sales quote in Altoviz. Quotes can later be sent to the customer by email using the **Send Quote by Email** tool.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      customerId: z.number().optional().describe('Altoviz customer ID'),
      customerNumber: z.string().optional(),
      date: z.string().optional().describe('Quote date (YYYY-MM-DD)'),
      internalId: z.string().optional(),
      headerNotes: z.string().optional(),
      footerNotes: z.string().optional(),
      lines: z.array(lineItemSchema).optional().describe('Quote line items'),
      metadata: z.record(z.string(), z.any()).optional()
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete provider response, including fields not shown in the summary'),
      quoteId: z.number().describe('Altoviz quote ID'),
      number: z.string().nullable().optional(),
      date: z.string().nullable().optional(),
      taxExcludedAmount: z.number().nullable().optional(),
      taxIncludedAmount: z.number().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createSaleQuote(ctx.input);

    return {
      output: {
        raw: result,
        quoteId: result.id,
        number: result.number,
        date: result.date,
        taxExcludedAmount: result.taxExcludedAmount,
        taxIncludedAmount: result.taxIncludedAmount
      },
      message: `Created quote **${result.number || result.id}**.`
    };
  })
  .build();
