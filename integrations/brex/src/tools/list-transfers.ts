import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transferSchema = z.object({
  transferId: z.string().describe('Unique identifier of the transfer'),
  status: z.string().optional().describe('Transfer status'),
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
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTransfers({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let transfers = result.items.map((t: any) => ({
      transferId: t.id,
      status: t.status,
      amount: t.amount ? { amount: t.amount.amount, currency: t.amount.currency } : undefined,
      description: t.description,
      externalMemo: t.external_memo,
      counterpartyType: t.counterparty?.type,
      createdAt: t.created_at
    }));

    return {
      output: {
        transfers,
        nextCursor: result.next_cursor
      },
      message: `Found **${transfers.length}** transfer(s).${result.next_cursor ? ' More results available.' : ''}`
    };
  })
  .build();
