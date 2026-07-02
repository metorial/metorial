import { SlateTool } from 'slates';
import { z } from 'zod';
import { coinbaseOAuthAuthMethods } from '../lib/auth-methods';
import { CoinbaseClient } from '../lib/client';
import { spec } from '../spec';

let transactionSchema = z.object({
  transactionId: z.string(),
  transactionType: z.string().describe('Type: send, receive, buy, sell, transfer, etc.'),
  status: z.string(),
  amount: z.string().optional(),
  currency: z.string().optional(),
  nativeAmount: z.string().optional(),
  nativeCurrency: z.string().optional(),
  description: z.string().optional().nullable(),
  createdAt: z.string().optional()
});

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Retrieve transaction history for a Coinbase account. Returns sends, receives, buys, sells, deposits, withdrawals, and transfers. Supports pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(coinbaseOAuthAuthMethods)
  .input(
    z.object({
      accountId: z.string().describe('Account ID to list transactions for'),
      limit: z.number().optional().describe('Max results to return (default 25)'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination — transaction ID to start after')
    })
  )
  .output(
    z.object({
      transactions: z.array(transactionSchema).describe('List of transactions'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinbaseClient({ token: ctx.auth.token });

    let result = await client.listTransactions(ctx.input.accountId, {
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter
    });

    let transactions = result.data || [];

    return {
      output: {
        transactions: transactions.map((tx: any) => ({
          transactionId: tx.id,
          transactionType: tx.type,
          status: tx.status,
          amount: tx.amount?.amount,
          currency: tx.amount?.currency,
          nativeAmount: tx.native_amount?.amount,
          nativeCurrency: tx.native_amount?.currency,
          description: tx.description || null,
          createdAt: tx.created_at
        })),
        hasMore: !!result.pagination?.next_uri
      },
      message: `Found **${transactions.length}** transaction(s) for account ${ctx.input.accountId}`
    };
  })
  .build();
