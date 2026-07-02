import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

let insiderTransactionSchema = z.object({
  code: z.string().describe('Ticker symbol'),
  date: z.string().describe('Transaction date'),
  ownerCik: z.string().optional().nullable().describe('CIK of the insider'),
  ownerName: z.string().optional().nullable().describe('Name of the insider'),
  transactionDate: z.string().optional().nullable().describe('Date of transaction'),
  transactionCode: z
    .string()
    .optional()
    .nullable()
    .describe('Transaction code: P=Purchase, S=Sale'),
  transactionAmount: z.number().optional().nullable().describe('Number of shares transacted'),
  transactionPrice: z.number().optional().nullable().describe('Price per share'),
  transactionAcquiredDisposed: z
    .string()
    .optional()
    .nullable()
    .describe('A=Acquired, D=Disposed'),
  postTransactionAmount: z
    .number()
    .optional()
    .nullable()
    .describe('Shares held after transaction'),
  secLink: z.string().optional().nullable().describe('Link to SEC filing')
});

export let getInsiderTransactions = SlateTool.create(spec, {
  name: 'Get Insider Transactions',
  key: 'get_insider_transactions',
  description: `Retrieve insider trading data from SEC Form 4 filings for US companies. Shows insider purchases and sales with transaction details including prices, amounts, and filing links.`,
  constraints: ['Each request consumes 10 API calls', 'Only available for US companies'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z
        .string()
        .optional()
        .describe('Ticker symbol to filter, e.g., AAPL.US (omit for all companies)'),
      from: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      to: z.string().optional().describe('End date in YYYY-MM-DD format'),
      limit: z.number().optional().describe('Max results (1-1000, default: 100)')
    })
  )
  .output(
    z.object({
      transactions: z.array(insiderTransactionSchema).describe('Insider transaction records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });

    let transactions = await client.getInsiderTransactions({
      code: ctx.input.ticker,
      from: ctx.input.from,
      to: ctx.input.to,
      limit: ctx.input.limit
    });

    let transactionsArray = Array.isArray(transactions) ? transactions : [];

    return {
      output: {
        transactions: transactionsArray
      },
      message: `Retrieved **${transactionsArray.length}** insider transactions${ctx.input.ticker ? ` for **${ctx.input.ticker}**` : ''}.`
    };
  })
  .build();
