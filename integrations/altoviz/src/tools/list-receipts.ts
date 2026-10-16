import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let receiptSchema = z.object({
  raw: z.record(z.string(), z.unknown()).optional(),
  receiptId: z.number().describe('Altoviz receipt ID'),
  date: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  supplierId: z.number().nullable().optional()
});

export let listReceipts = SlateTool.create(spec, {
  name: 'List Receipts',
  key: 'list_receipts',
  description: `List receipts from your Altoviz account with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Full-text search query'),
      orderBy: z
        .string()
        .optional()
        .describe('Provider ordering expression, for example name desc'),
      pageIndex: z.number().optional().describe('Page index (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      receipts: z.array(receiptSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let receipts = await client.listReceipts({
      query: ctx.input.query,
      orderBy: ctx.input.orderBy,
      pageIndex: ctx.input.pageIndex,
      pageSize: ctx.input.pageSize
    });

    let mapped = receipts.map((r: any) => ({
      raw: r,
      receiptId: r.id,
      date: r.date,
      amount: r.amount,
      description: r.notes ?? r.description,
      supplierId: r.supplierId
    }));

    return {
      output: { receipts: mapped },
      message: `Found **${mapped.length}** receipt(s).`
    };
  })
  .build();
