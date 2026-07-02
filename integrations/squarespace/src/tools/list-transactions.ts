import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Retrieve financial transactions for orders and donations on a Squarespace merchant site. Includes payment amounts, refunds, processing fees, shipping, tax, and discount details. Supports Squarespace, Stripe, PayPal, and Square payment gateways.`,
  instructions: [
    'Use ISO 8601 UTC format for date parameters',
    'Cannot combine cursor with date range filters',
    'Donations are only accessible through the Transactions API, not the Orders API'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modifiedAfter: z
        .string()
        .optional()
        .describe('ISO 8601 UTC datetime — only return transactions modified after this date'),
      modifiedBefore: z
        .string()
        .optional()
        .describe(
          'ISO 8601 UTC datetime — only return transactions modified before this date'
        ),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      transactions: z.array(z.any()).describe('Array of transaction documents'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      nextPageCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTransactions({
      modifiedAfter: ctx.input.modifiedAfter,
      modifiedBefore: ctx.input.modifiedBefore,
      cursor: ctx.input.cursor
    });

    return {
      output: {
        transactions: result.documents,
        hasNextPage: result.pagination.hasNextPage,
        nextPageCursor: result.pagination.nextPageCursor
      },
      message: `Retrieved **${result.documents.length}** transaction(s).${result.pagination.hasNextPage ? ' More results available via pagination.' : ''}`
    };
  })
  .build();
