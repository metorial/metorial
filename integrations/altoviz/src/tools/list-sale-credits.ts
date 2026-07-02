import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let creditSummarySchema = z.object({
  creditId: z.number().describe('Altoviz credit ID'),
  number: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  customerNumber: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  taxExcludedAmount: z.number().nullable().optional(),
  taxAmount: z.number().nullable().optional(),
  taxIncludedAmount: z.number().nullable().optional(),
  status: z.string().nullable().optional()
});

export let listSaleCredits = SlateTool.create(spec, {
  name: 'List Sale Credits',
  key: 'list_sale_credits',
  description: `List sales credits from your Altoviz account with pagination support.`,
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
      credits: z.array(creditSummarySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let credits = await client.listSaleCredits({
      pageIndex: ctx.input.pageIndex,
      pageSize: ctx.input.pageSize
    });

    let mapped = credits.map((c: any) => ({
      creditId: c.id,
      number: c.number,
      date: c.date,
      customerNumber: c.customerNumber,
      customerName: c.customerName,
      taxExcludedAmount: c.taxExcludedAmount,
      taxAmount: c.taxAmount,
      taxIncludedAmount: c.taxIncludedAmount,
      status: c.status
    }));

    return {
      output: { credits: mapped },
      message: `Found **${mapped.length}** credit(s).`
    };
  })
  .build();
