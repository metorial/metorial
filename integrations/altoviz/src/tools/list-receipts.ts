import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let receiptSchema = z.object({
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
      pageIndex: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (1-100, default 10)')
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
      pageIndex: ctx.input.pageIndex,
      pageSize: ctx.input.pageSize
    });

    let mapped = receipts.map((r: any) => ({
      receiptId: r.id,
      date: r.date,
      amount: r.amount,
      description: r.description,
      supplierId: r.supplierId
    }));

    return {
      output: { receipts: mapped },
      message: `Found **${mapped.length}** receipt(s).`
    };
  })
  .build();
