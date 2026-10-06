import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTransaction } from '../lib/models';
import { budgetInput, deltaInput, idInput, milliunits } from '../lib/validation';
import { spec } from '../spec';

let transactionSchema = z.object({
  type: z
    .enum(['transaction', 'subtransaction'])
    .optional()
    .describe('Category/payee/month routes may return split parts.'),
  parentTransactionId: z
    .string()
    .nullable()
    .optional()
    .describe('Parent ID when the row is a split part.'),
  transactionId: z.string().describe('Unique identifier for the transaction'),
  date: z.string().describe('Transaction date (YYYY-MM-DD)'),
  amount: milliunits.describe('Amount in milliunits (negative for outflows)'),
  memo: z.string().nullable().optional().describe('Transaction memo'),
  cleared: z.string().describe('Cleared status: cleared, uncleared, or reconciled'),
  approved: z.boolean().describe('Whether the transaction is approved'),
  flagColor: z.string().nullable().optional().describe('Flag color'),
  accountId: z.string().describe('Account ID'),
  accountName: z.string().optional().describe('Account name'),
  payeeId: z.string().nullable().optional().describe('Payee ID'),
  payeeName: z.string().nullable().optional().describe('Payee name'),
  categoryId: z.string().nullable().optional().describe('Category ID'),
  categoryName: z.string().nullable().optional().describe('Category name'),
  transferAccountId: z
    .string()
    .nullable()
    .optional()
    .describe('Transfer account ID if this is a transfer'),
  importId: z.string().nullable().optional().describe('Import ID for deduplication'),
  deleted: z.boolean().describe('Whether the transaction is deleted')
});

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Retrieve transactions from a budget with flexible filtering. Filter by account, category, payee, month, date, or type (uncategorized/unapproved). Amounts are in milliunits (e.g., -10000 = -$10.00 outflow).`,
  instructions: [
    'The provider defaults sinceDate to one year ago on budget/account/category/payee lists. Provide an earlier date for older history.',
    'Use filterType to get only uncategorized or unapproved transactions',
    'Provide at most one of accountId, categoryId, payeeId, or month to filter results'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lastKnowledgeOfServer: deltaInput,
      budgetId: budgetInput,
      accountId: idInput.optional().describe('Filter by account ID'),
      categoryId: idInput.optional().describe('Filter by category ID'),
      payeeId: idInput.optional().describe('Filter by payee ID'),
      month: z
        .string()
        .optional()
        .describe('Filter by month (YYYY-MM-DD, first day of the month)'),
      untilDate: z
        .string()
        .optional()
        .describe('Only return transactions on or before this UTC date (YYYY-MM-DD).'),
      sinceDate: z
        .string()
        .optional()
        .describe('Only return transactions on or after this date (YYYY-MM-DD)'),
      filterType: z
        .enum(['uncategorized', 'unapproved'])
        .optional()
        .describe('Filter by transaction type')
    })
  )
  .output(
    z.object({
      serverKnowledge: milliunits
        .nonnegative()
        .optional()
        .describe('Knowledge returned by this endpoint for subsequent delta requests.'),
      transactions: z.array(transactionSchema).describe('List of transactions')
    })
  )
  .handleInvocation(async ctx => {
    const data = await new Client({ token: ctx.auth.token }).getTransactions(
      ctx.input.budgetId ?? ctx.config.budgetId,
      {
        accountId: ctx.input.accountId,
        categoryId: ctx.input.categoryId,
        payeeId: ctx.input.payeeId,
        month: ctx.input.month,
        sinceDate: ctx.input.sinceDate,
        untilDate: ctx.input.untilDate,
        type: ctx.input.filterType,
        lastKnowledge: ctx.input.lastKnowledgeOfServer
      }
    );
    return {
      output: {
        transactions: data.transactions.map(mapTransaction),
        serverKnowledge: data.serverKnowledge
      },
      message: `Returned ${data.transactions.length} transaction record(s).`
    };
  })
  .build();
