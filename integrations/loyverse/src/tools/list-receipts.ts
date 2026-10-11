import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, joinIds } from '../lib/client';
import { mapReceipt, receiptSchema } from '../lib/receipts';
import { spec } from '../spec';

export let listReceipts = SlateTool.create(spec, {
  name: 'List Receipts',
  key: 'list_receipts',
  description: `Retrieve sales and refund receipts (transactions) from Loyverse, newest first. Filter by store, receipt numbers, order, source, or created/updated date ranges for syncing sales data. Returns line items, payments, discounts, and tax details.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of receipts to return (1-250, default 50)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      storeId: z.string().optional().describe('Only return receipts from this store'),
      receiptNumbers: z
        .array(z.string())
        .optional()
        .describe('Only return receipts with these receipt numbers'),
      sinceReceiptNumber: z
        .string()
        .optional()
        .describe('Only return receipts created at or after the given receipt'),
      beforeReceiptNumber: z
        .string()
        .optional()
        .describe('Only return receipts created at or before the given receipt'),
      order: z
        .string()
        .optional()
        .describe('Only return receipts with this order name/number'),
      source: z
        .string()
        .optional()
        .describe('Only return receipts from this source (e.g., "point of sale")'),
      createdAtMin: z
        .string()
        .optional()
        .describe('Filter receipts created at or after this ISO 8601 UTC timestamp'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Filter receipts created at or before this ISO 8601 UTC timestamp'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Filter receipts updated at or after this ISO 8601 UTC timestamp'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Filter receipts updated at or before this ISO 8601 UTC timestamp')
    })
  )
  .output(
    z.object({
      receipts: z.array(receiptSchema).describe('List of receipts'),
      cursor: z.string().nullable().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listReceipts({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      storeId: ctx.input.storeId,
      receiptNumbers: joinIds(ctx.input.receiptNumbers),
      sinceReceiptNumber: ctx.input.sinceReceiptNumber,
      beforeReceiptNumber: ctx.input.beforeReceiptNumber,
      order: ctx.input.order,
      source: ctx.input.source,
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax
    });

    let receipts = (result.receipts ?? []).map(mapReceipt);

    return {
      output: { receipts, cursor: result.cursor },
      message: `Retrieved **${receipts.length}** receipt(s).${result.cursor ? ' More available via cursor.' : ''}`
    };
  })
  .build();
