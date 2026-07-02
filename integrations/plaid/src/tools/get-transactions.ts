import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

let transactionSchema = z.object({
  transactionId: z.string().describe('Unique transaction identifier'),
  accountId: z.string().describe('Account the transaction belongs to'),
  amount: z
    .number()
    .describe('Transaction amount. Positive = money out, negative = money in.'),
  date: z.string().describe('Transaction date (YYYY-MM-DD)'),
  name: z.string().describe('Transaction description'),
  merchantName: z.string().nullable().optional().describe('Cleaned merchant name'),
  pending: z.boolean().describe('Whether the transaction is pending'),
  paymentChannel: z.string().optional().describe('Payment channel: in store, online, other'),
  category: z.string().nullable().optional().describe('Primary personal finance category'),
  categoryDetailed: z
    .string()
    .nullable()
    .optional()
    .describe('Detailed personal finance category'),
  isoCurrencyCode: z.string().nullable().optional().describe('ISO 4217 currency code')
});

export let getTransactionsTool = SlateTool.create(spec, {
  name: 'Get Transactions',
  key: 'get_transactions',
  description: `Retrieve transactions for a date range using offset-based pagination. Returns transactions along with total count for pagination. For incremental updates, prefer **Sync Transactions** instead.`,
  instructions: [
    'Use startDate and endDate in YYYY-MM-DD format.',
    'Use count and offset for pagination. Keep fetching while offset + count < totalTransactions.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accessToken: z.string().describe('Access token for the Plaid Item'),
      startDate: z.string().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().describe('End date (YYYY-MM-DD)'),
      count: z
        .number()
        .optional()
        .describe('Number of transactions to return (default 100, max 500)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
      accountIds: z.array(z.string()).optional().describe('Filter to specific account IDs')
    })
  )
  .output(
    z.object({
      transactions: z.array(transactionSchema),
      totalTransactions: z.number().describe('Total number of transactions matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.getTransactions(
      ctx.input.accessToken,
      ctx.input.startDate,
      ctx.input.endDate,
      {
        count: ctx.input.count,
        offset: ctx.input.offset,
        accountIds: ctx.input.accountIds
      }
    );

    let transactions = (result.transactions || []).map((t: any) => ({
      transactionId: t.transaction_id,
      accountId: t.account_id,
      amount: t.amount,
      date: t.date,
      name: t.name,
      merchantName: t.merchant_name ?? null,
      pending: t.pending,
      paymentChannel: t.payment_channel,
      category: t.personal_finance_category?.primary ?? null,
      categoryDetailed: t.personal_finance_category?.detailed ?? null,
      isoCurrencyCode: t.iso_currency_code ?? null
    }));

    return {
      output: {
        transactions,
        totalTransactions: result.total_transactions
      },
      message: `Retrieved **${transactions.length}** of **${result.total_transactions}** total transactions for ${ctx.input.startDate} to ${ctx.input.endDate}.`
    };
  })
  .build();
