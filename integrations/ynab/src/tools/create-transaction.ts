import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let subtransactionInput = z.object({
  amount: z.number().describe('Amount in milliunits'),
  payeeId: z.string().optional().describe('Payee ID'),
  payeeName: z
    .string()
    .optional()
    .describe('Payee name (max 200 chars). Used if payeeId is not provided.'),
  categoryId: z.string().optional().describe('Category ID'),
  memo: z.string().optional().describe('Memo (max 500 chars)')
});

let transactionInput = z.object({
  accountId: z.string().describe('Account ID for the transaction'),
  date: z.string().describe('Transaction date (YYYY-MM-DD)'),
  amount: z
    .number()
    .describe('Amount in milliunits (negative for outflows, positive for inflows)'),
  payeeId: z.string().optional().describe('Payee ID'),
  payeeName: z
    .string()
    .optional()
    .describe('Payee name (max 200 chars). Creates a new payee if no match exists.'),
  categoryId: z.string().optional().describe('Category ID'),
  memo: z.string().optional().describe('Memo (max 500 chars)'),
  cleared: z
    .enum(['cleared', 'uncleared', 'reconciled'])
    .optional()
    .describe('Cleared status'),
  approved: z
    .boolean()
    .optional()
    .describe('Whether the transaction is approved. Defaults to false.'),
  flagColor: z
    .enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple'])
    .nullable()
    .optional()
    .describe('Flag color'),
  importId: z.string().optional().describe('Import ID for deduplication (max 36 chars)'),
  subtransactions: z
    .array(subtransactionInput)
    .optional()
    .describe(
      'Split transaction parts. If provided, their amounts must sum to the transaction amount.'
    )
});

export let createTransaction = SlateTool.create(spec, {
  name: 'Create Transaction',
  key: 'create_transaction',
  description: `Create one or more transactions in a budget. Supports split transactions via subtransactions. Use importId for deduplication when importing transactions programmatically. Amounts are in milliunits (e.g., -10000 = -$10.00 outflow).`,
  constraints: [
    'Amounts are in milliunits: multiply dollar amount by 1000',
    'Subtransaction amounts must sum to the parent transaction amount',
    'importId max length is 36 characters'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      budgetId: z
        .string()
        .optional()
        .describe('Budget ID. Defaults to the configured budget.'),
      transactions: z
        .array(transactionInput)
        .min(1)
        .describe('One or more transactions to create')
    })
  )
  .output(
    z.object({
      transactionIds: z.array(z.string()).describe('IDs of created transactions'),
      duplicateImportIds: z
        .array(z.string())
        .optional()
        .describe('Import IDs that were duplicates and skipped'),
      serverKnowledge: z.number().optional().describe('Server knowledge after the operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;

    let txns = ctx.input.transactions.map(t => ({
      account_id: t.accountId,
      date: t.date,
      amount: t.amount,
      payee_id: t.payeeId,
      payee_name: t.payeeName,
      category_id: t.categoryId,
      memo: t.memo,
      cleared: t.cleared,
      approved: t.approved,
      flag_color: t.flagColor,
      import_id: t.importId,
      subtransactions: t.subtransactions?.map(s => ({
        amount: s.amount,
        payee_id: s.payeeId,
        payee_name: s.payeeName,
        category_id: s.categoryId,
        memo: s.memo
      }))
    }));

    let result: any;
    if (txns.length === 1) {
      result = await client.createTransaction(budgetId, txns[0]!);
    } else {
      result = await client.createTransactions(budgetId, txns);
    }

    let transactionIds = result?.transaction_ids ?? [];
    let duplicateImportIds = result?.duplicate_import_ids ?? [];

    return {
      output: {
        transactionIds,
        duplicateImportIds: duplicateImportIds.length > 0 ? duplicateImportIds : undefined,
        serverKnowledge: result?.server_knowledge
      },
      message: `Created **${transactionIds.length}** transaction(s)${duplicateImportIds.length > 0 ? `, ${duplicateImportIds.length} duplicate(s) skipped` : ''}`
    };
  })
  .build();
