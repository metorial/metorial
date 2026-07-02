import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  description: z.string().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  vatId: z.number().optional().describe('VAT rate ID'),
  productNumber: z.string().optional(),
  discount: z.number().optional(),
  unit: z.string().optional()
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
