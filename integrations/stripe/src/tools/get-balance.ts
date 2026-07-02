import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { stripeServiceError } from '../lib/errors';
import { spec } from '../spec';

let balanceAmountSchema = z.object({
  amount: z.number().describe('Amount in smallest currency unit'),
  currency: z.string().describe('Currency code')
});

export let getBalance = SlateTool.create(spec, {
  name: 'Get Balance',
  key: 'get_balance',
  description: `Retrieve your Stripe account balance across available, pending, and reserved states. Also list balance transactions to see a detailed ledger of funds movements.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['get_balance', 'list_transactions', 'get_transaction'])
        .describe('Operation to perform'),
      transactionId: z
        .string()
        .optional()
        .describe('Balance transaction ID (for get_transaction)'),
      limit: z.number().optional().describe('Max results (for list_transactions)'),
      startingAfter: z.string().optional().describe('Cursor for pagination'),
      type: z
        .string()
        .optional()
        .describe('Filter transactions by type (e.g., charge, refund, payout, transfer)')
    })
  )
  .output(
    z.object({
      available: z
        .array(balanceAmountSchema)
        .optional()
        .describe('Available balance by currency'),
      pending: z.array(balanceAmountSchema).optional().describe('Pending balance by currency'),
      // Transaction fields
      transactionId: z.string().optional().describe('Balance transaction ID'),
      transactionAmount: z.number().optional().describe('Transaction amount'),
      transactionCurrency: z.string().optional().describe('Transaction currency'),
      transactionType: z.string().optional().describe('Transaction type'),
      transactionDescription: z
        .string()
        .optional()
        .nullable()
        .describe('Transaction description'),
      net: z.number().optional().describe('Net amount after fees'),
      fee: z.number().optional().describe('Fee amount'),
      created: z.number().optional().describe('Creation timestamp'),
      // List
      transactions: z
        .array(
          z.object({
            transactionId: z.string(),
            amount: z.number(),
            currency: z.string(),
            type: z.string(),
            net: z.number(),
            fee: z.number(),
            created: z.number()
          })
        )
        .optional()
        .describe('List of balance transactions'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StripeClient({
      token: ctx.auth.token,
      stripeAccountId: ctx.config.stripeAccountId
    });

    let { action } = ctx.input;

    if (action === 'get_balance') {
      let balance = await client.getBalance();
      return {
        output: {
          available:
            balance.available?.map((b: any) => ({ amount: b.amount, currency: b.currency })) ||
            [],
          pending:
            balance.pending?.map((b: any) => ({ amount: b.amount, currency: b.currency })) ||
            []
        },
        message: `**Balance**: ${balance.available?.map((b: any) => `${b.amount} ${b.currency.toUpperCase()} available`).join(', ') || 'No balance'}`
      };
    }

    if (action === 'get_transaction') {
      if (!ctx.input.transactionId)
        throw stripeServiceError('transactionId is required for get_transaction action');
      let txn = await client.getBalanceTransaction(ctx.input.transactionId);
      return {
        output: {
          transactionId: txn.id,
          transactionAmount: txn.amount,
          transactionCurrency: txn.currency,
          transactionType: txn.type,
          transactionDescription: txn.description,
          net: txn.net,
          fee: txn.fee,
          created: txn.created
        },
        message: `Balance transaction **${txn.id}**: ${txn.amount} ${txn.currency.toUpperCase()} (${txn.type}) — net: ${txn.net}, fee: ${txn.fee}`
      };
    }

    // list_transactions
    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.startingAfter) params.starting_after = ctx.input.startingAfter;
    if (ctx.input.type) params.type = ctx.input.type;

    let result = await client.listBalanceTransactions(params);
    return {
      output: {
        transactions: result.data.map((t: any) => ({
          transactionId: t.id,
          amount: t.amount,
          currency: t.currency,
          type: t.type,
          net: t.net,
          fee: t.fee,
          created: t.created
        })),
        hasMore: result.has_more
      },
      message: `Found **${result.data.length}** balance transaction(s)${result.has_more ? ' (more available)' : ''}`
    };
  })
  .build();
