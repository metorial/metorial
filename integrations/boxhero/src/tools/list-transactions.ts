import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTransaction, transactionSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Retrieve inventory transactions from BoxHero. Requires a team in Location mode. Supports filtering by transaction type (in, out, adjust, move) and pagination.`,
  constraints: [
    'Rate limited to 5 requests per second and 300 requests per minute per team.',
    'Fetches full details for every transaction on the page; use a smaller limit for faster results.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['in', 'out', 'adjust', 'move'])
        .optional()
        .describe('Filter by transaction type'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of transactions to return per page'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      transactions: z.array(transactionSchema).describe('List of inventory transactions'),
      hasMore: z.boolean().describe('Whether more transactions are available'),
      cursor: z.string().optional().describe('Cursor for the next page'),
      raw: z.unknown().optional().describe('Original summary page returned by BoxHero')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listTransactions({
      type: ctx.input.type,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let transactions = response.items.map(mapTransaction);

    let typeLabel = ctx.input.type ? ` of type "${ctx.input.type}"` : '';
    return {
      output: {
        transactions,
        hasMore: response.has_more,
        cursor: response.cursor == null ? undefined : String(response.cursor),
        raw: response.raw
      },
      message: `Retrieved ${transactions.length} transaction(s)${typeLabel}.${response.has_more ? ' More available — use the cursor for the next page.' : ''}`
    };
  })
  .build();
