import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTransfer } from '../lib/schemas';
import { spec } from '../spec';

let transferSchema = z.object({
  transferId: z.string().describe('Unique identifier of the transfer'),
  status: z.string().nullish().describe('Transfer status'),
  amount: z
    .object({
      amount: z.number().describe('Amount in cents'),
      currency: z.string().nullable().describe('Currency code')
    })
    .optional()
    .describe('Transfer amount'),
  description: z.string().nullable().optional().describe('Internal description'),
  externalMemo: z.string().nullable().optional().describe('Memo visible to counterparty'),
  counterpartyType: z.string().optional().describe('Type of counterparty'),
  createdAt: z.string().nullable().optional().describe('ISO 8601 creation timestamp')
});

export let listTransfers = SlateTool.create(spec, {
  name: 'List Transfers',
  key: 'list_transfers',
  description: `List payment transfers (ACH, wire, check) from your Brex cash accounts. Returns transfer details including status, amount, and counterparty information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor for fetching next page'),
      limit: z.number().optional().describe('Maximum number of results per page (max 1000)')
    })
  )
  .output(
    z.object({
      transfers: z.array(transferSchema).describe('List of transfers'),
      nextCursor: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).listTransfers({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });
    const transfers = result.items.map(mapTransfer);
    return {
      output: { transfers, nextCursor: result.next_cursor },
      message: `Returned ${transfers.length} transfers.`
    };
  })
  .build();
