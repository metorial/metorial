import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let quoteSummarySchema = z.object({
  quoteId: z.number().describe('Altoviz quote ID'),
  number: z.string().nullable().optional().describe('Quote number'),
  date: z.string().nullable().optional().describe('Quote date (YYYY-MM-DD)'),
  customerNumber: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  taxExcludedAmount: z.number().nullable().optional(),
  taxAmount: z.number().nullable().optional(),
  taxIncludedAmount: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  internalId: z.string().nullable().optional()
});

export let listSaleQuotes = SlateTool.create(spec, {
  name: 'List Sale Quotes',
  key: 'list_sale_quotes',
  description: `List sales quotes from your Altoviz account with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageIndex: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (1-100, default 10)')
    })
  )
  .output(
    z.object({
      quotes: z.array(quoteSummarySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let quotes = await client.listSaleQuotes({
      pageIndex: ctx.input.pageIndex,
      pageSize: ctx.input.pageSize
    });

    let mapped = quotes.map((q: any) => ({
      quoteId: q.id,
      number: q.number,
      date: q.date,
      customerNumber: q.customerNumber,
      customerName: q.customerName,
      taxExcludedAmount: q.taxExcludedAmount,
      taxAmount: q.taxAmount,
      taxIncludedAmount: q.taxIncludedAmount,
      status: q.status,
      internalId: q.internalId
    }));

    return {
      output: { quotes: mapped },
      message: `Found **${mapped.length}** quote(s).`
    };
  })
  .build();
