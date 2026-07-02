import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transactionSchema = z.object({
  transactionId: z.string().describe('Unique identifier of the transaction'),
  type: z.string().optional().describe('Transaction type'),
  amount: z
    .object({
      amount: z.number().describe('Amount in cents'),
      currency: z.string().nullable().describe('Currency code')
    })
    .optional()
    .describe('Transaction amount'),
  merchantName: z
    .string()
    .nullable()
    .optional()
    .describe('Name of the merchant (card transactions)'),
  description: z.string().nullable().optional().describe('Transaction description'),
  postedAt: z
    .string()
    .nullable()
    .optional()
    .describe('ISO 8601 timestamp when the transaction was posted'),
  cardId: z.string().nullable().optional().describe('ID of the card used (card transactions)'),
  userId: z.string().nullable().optional().describe('ID of the user who made the transaction'),
  initiatedBy: z
    .string()
    .nullable()
    .optional()
    .describe('Who initiated the transaction (cash transactions)')
});

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `List settled transactions from Brex card or cash accounts.
Use **source** to choose between card transactions (purchases, refunds, chargebacks) and cash transactions (ACH, wires, etc.).
Only settled transactions are returned; pending transactions are not available.`,
  instructions: [
    "For card transactions, optionally filter by userIds to see a specific employee's activity.",
    'For cash transactions, provide the cashAccountId of the cash account to query.',
    'Use postedAtStart to fetch transactions after a specific date.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      source: z.enum(['card', 'cash']).describe('Transaction source: card or cash account'),
      cashAccountId: z
        .string()
        .optional()
        .describe('Cash account ID (required when source is "cash")'),
      userIds: z.array(z.string()).optional().describe('Filter card transactions by user IDs'),
      postedAtStart: z
        .string()
        .optional()
        .describe('Return transactions posted after this ISO 8601 timestamp'),
      cursor: z.string().optional().describe('Pagination cursor for fetching next page'),
      limit: z.number().optional().describe('Maximum number of results per page (max 1000)')
    })
  )
  .output(
    z.object({
      transactions: z.array(transactionSchema).describe('List of transactions'),
      nextCursor: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.source === 'card') {
      result = await client.listCardTransactions({
        cursor: ctx.input.cursor,
        limit: ctx.input.limit,
        user_ids: ctx.input.userIds,
        posted_at_start: ctx.input.postedAtStart
      });
    } else {
      if (!ctx.input.cashAccountId) {
        throw new Error('cashAccountId is required when source is "cash"');
      }
      result = await client.listCashTransactions(ctx.input.cashAccountId, {
        cursor: ctx.input.cursor,
        limit: ctx.input.limit,
        posted_at_start: ctx.input.postedAtStart
      });
    }

    let transactions = result.items.map((t: any) => ({
      transactionId: t.id,
      type: t.type ?? t.card_metadata?.type,
      amount: t.amount ? { amount: t.amount.amount, currency: t.amount.currency } : undefined,
      merchantName:
        t.merchant?.raw_descriptor ?? t.card_metadata?.merchant?.raw_descriptor ?? null,
      description: t.description,
      postedAt: t.posted_at,
      cardId: t.card_id ?? t.card_metadata?.card_id,
      userId: t.user_id,
      initiatedBy: t.initiated_by_id
    }));

    return {
      output: {
        transactions,
        nextCursor: result.next_cursor
      },
      message: `Found **${transactions.length}** ${ctx.input.source} transaction(s).${result.next_cursor ? ' More results available.' : ''}`
    };
  })
  .build();
