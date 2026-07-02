import { SlateTool } from 'slates';
import { z } from 'zod';
import { PoofClient } from '../lib/client';
import { spec } from '../spec';

export let getTransactions = SlateTool.create(spec, {
  name: 'Get Transactions',
  key: 'get_transactions',
  description: `Fetch transactions from your Poof account. Retrieve a single transaction by ID, list all transactions, or search/filter transactions by various criteria such as email, name, amount, payment type, crypto address, or metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transactionId: z.string().optional().describe('Fetch a specific transaction by its ID'),
      filter: z
        .enum(['id', 'email', 'name', 'amount', 'payment', 'crypto_address', 'metadata'])
        .optional()
        .describe('Filter field for searching transactions'),
      search: z.string().optional().describe('Search value to match against the filter field')
    })
  )
  .output(
    z.object({
      transactions: z.any().describe('Transaction data returned from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PoofClient({ token: ctx.auth.token });

    let result: unknown;

    if (ctx.input.transactionId) {
      result = await client.getTransaction({ transactionId: ctx.input.transactionId });
      return {
        output: { transactions: result },
        message: `Fetched transaction **${ctx.input.transactionId}**.`
      };
    }

    if (ctx.input.filter && ctx.input.search) {
      result = await client.queryTransactions({
        filter: ctx.input.filter,
        search: ctx.input.search
      });
      return {
        output: { transactions: result },
        message: `Found transactions matching **${ctx.input.filter}** = "${ctx.input.search}".`
      };
    }

    result = await client.listTransactions();
    let count = Array.isArray(result) ? result.length : 'unknown number of';
    return {
      output: { transactions: result },
      message: `Fetched ${count} transactions.`
    };
  })
  .build();
