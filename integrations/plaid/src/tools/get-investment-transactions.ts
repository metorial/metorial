import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

let investmentTransactionSchema = z.object({
  investmentTransactionId: z.string().describe('Unique investment transaction ID'),
  accountId: z.string().describe('Investment account ID'),
  securityId: z.string().nullable().optional().describe('Related security ID'),
  date: z.string().describe('Transaction date (YYYY-MM-DD)'),
  name: z.string().describe('Transaction description'),
  amount: z
    .number()
    .describe('Transaction amount. Positive = outflow (purchase), negative = inflow (sale).'),
  price: z.number().describe('Price per unit'),
  quantity: z.number().describe('Number of units'),
  fees: z.number().nullable().optional().describe('Transaction fees'),
  type: z.string().describe('Transaction type: buy, sell, cancel, cash, fee, transfer'),
  subtype: z.string().nullable().optional().describe('Transaction subtype'),
  isoCurrencyCode: z.string().nullable().optional().describe('ISO 4217 currency code')
});

export let getInvestmentTransactionsTool = SlateTool.create(spec, {
  name: 'Get Investment Transactions',
  key: 'get_investment_transactions',
  description: `Retrieve investment transaction history (buys, sells, dividends, fees, transfers) for a date range. Supports offset-based pagination for large result sets. Up to 24 months of history may be available.`,
  instructions: [
    'Use startDate and endDate in YYYY-MM-DD format.',
    'Advance offset by returnedCount while it is below totalInvestmentTransactions; stop on an empty page.'
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
      count: z.number().optional().describe('Number of transactions to return (default 100)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
      accountIds: z
        .array(z.string())
        .optional()
        .describe('Filter to specific investment account IDs')
    })
  )
  .output(
    z.object({
      investmentTransactions: z.array(investmentTransactionSchema),
      totalInvestmentTransactions: z.number().describe('Provider total matching the query'),
      returnedCount: z
        .number()
        .optional()
        .describe('Investment transactions returned on this page'),
      nextOffset: z.number().optional().describe('Next offset when more results are indicated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.getInvestmentTransactions(
      ctx.input.accessToken,
      ctx.input.startDate,
      ctx.input.endDate,
      {
        count: ctx.input.count,
        offset: ctx.input.offset,
        accountIds: ctx.input.accountIds
      }
    );

    let investmentTransactions = result.investment_transactions.map(t => ({
      investmentTransactionId: t.investment_transaction_id,
      accountId: t.account_id,
      securityId: t.security_id ?? null,
      date: t.date,
      name: t.name,
      amount: t.amount,
      price: t.price,
      quantity: t.quantity,
      fees: t.fees ?? null,
      type: t.type,
      subtype: t.subtype ?? null,
      isoCurrencyCode: t.iso_currency_code ?? null
    }));

    return {
      output: {
        investmentTransactions,
        totalInvestmentTransactions: result.total_investment_transactions,
        returnedCount: investmentTransactions.length,
        nextOffset:
          investmentTransactions.length > 0 &&
          (ctx.input.offset ?? 0) + investmentTransactions.length <
            result.total_investment_transactions
            ? (ctx.input.offset ?? 0) + investmentTransactions.length
            : undefined
      },
      message: `Retrieved **${investmentTransactions.length}** of **${result.total_investment_transactions}** investment transactions.`
    };
  })
  .build();
