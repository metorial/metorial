import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transactionSchema = z.object({
  transactionId: z.string().describe('Unique identifier for the transaction'),
  date: z.string().describe('Transaction date (YYYY-MM-DD)'),
  amount: z.number().describe('Amount in milliunits (negative for outflows)'),
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
    'Use sinceDate to retrieve only transactions on or after a specific date',
    'Use filterType to get only uncategorized or unapproved transactions',
    'Provide at most one of accountId, categoryId, payeeId, or month to filter results'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      budgetId: z
        .string()
        .optional()
        .describe('Budget ID. Defaults to the configured budget.'),
      accountId: z.string().optional().describe('Filter by account ID'),
      categoryId: z.string().optional().describe('Filter by category ID'),
      payeeId: z.string().optional().describe('Filter by payee ID'),
      month: z
        .string()
        .optional()
        .describe('Filter by month (YYYY-MM-DD, first day of the month)'),
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
      transactions: z.array(transactionSchema).describe('List of transactions'),
      serverKnowledge: z.number().optional().describe('Server knowledge for delta requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;
    let options = { sinceDate: ctx.input.sinceDate, type: ctx.input.filterType };

    let transactions: any[];
    let serverKnowledge: number | undefined;

    if (ctx.input.accountId) {
      let result = await client.getTransactionsByAccount(
        budgetId,
        ctx.input.accountId,
        options
      );
      transactions = result.transactions;
      serverKnowledge = result.serverKnowledge;
    } else if (ctx.input.categoryId) {
      transactions = await client.getTransactionsByCategory(
        budgetId,
        ctx.input.categoryId,
        options
      );
    } else if (ctx.input.payeeId) {
      transactions = await client.getTransactionsByPayee(budgetId, ctx.input.payeeId, options);
    } else if (ctx.input.month) {
      transactions = await client.getTransactionsByMonth(budgetId, ctx.input.month, options);
    } else {
      let result = await client.getTransactions(budgetId, options);
      transactions = result.transactions;
      serverKnowledge = result.serverKnowledge;
    }

    let mapped = transactions.map((t: any) => ({
      transactionId: t.id,
      date: t.date,
      amount: t.amount,
      memo: t.memo,
      cleared: t.cleared,
      approved: t.approved,
      flagColor: t.flag_color,
      accountId: t.account_id,
      accountName: t.account_name,
      payeeId: t.payee_id,
      payeeName: t.payee_name,
      categoryId: t.category_id,
      categoryName: t.category_name,
      transferAccountId: t.transfer_account_id,
      importId: t.import_id,
      deleted: t.deleted
    }));

    return {
      output: { transactions: mapped, serverKnowledge },
      message: `Found **${mapped.length}** transaction(s)`
    };
  })
  .build();
