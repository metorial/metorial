import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let subtransactionSchema = z.object({
  subtransactionId: z.string().describe('Subtransaction ID'),
  amount: z.number().describe('Amount in milliunits'),
  memo: z.string().nullable().optional().describe('Memo'),
  payeeId: z.string().nullable().optional().describe('Payee ID'),
  payeeName: z.string().nullable().optional().describe('Payee name'),
  categoryId: z.string().nullable().optional().describe('Category ID'),
  categoryName: z.string().nullable().optional().describe('Category name'),
  transferAccountId: z.string().nullable().optional().describe('Transfer account ID'),
  deleted: z.boolean().describe('Whether deleted')
});

export let getTransaction = SlateTool.create(spec, {
  name: 'Get Transaction',
  key: 'get_transaction',
  description: `Retrieve detailed information about a single transaction, including subtransactions (splits), transfer details, and import metadata.`,
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
      transactionId: z.string().describe('Transaction ID to retrieve')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      date: z.string().describe('Transaction date'),
      amount: z.number().describe('Amount in milliunits'),
      memo: z.string().nullable().optional().describe('Memo'),
      cleared: z.string().describe('Cleared status'),
      approved: z.boolean().describe('Whether approved'),
      flagColor: z.string().nullable().optional().describe('Flag color'),
      accountId: z.string().describe('Account ID'),
      accountName: z.string().optional().describe('Account name'),
      payeeId: z.string().nullable().optional().describe('Payee ID'),
      payeeName: z.string().nullable().optional().describe('Payee name'),
      categoryId: z.string().nullable().optional().describe('Category ID'),
      categoryName: z.string().nullable().optional().describe('Category name'),
      transferAccountId: z.string().nullable().optional().describe('Transfer account ID'),
      transferTransactionId: z
        .string()
        .nullable()
        .optional()
        .describe('Transfer counterpart transaction ID'),
      matchedTransactionId: z
        .string()
        .nullable()
        .optional()
        .describe('Matched transaction ID'),
      importId: z.string().nullable().optional().describe('Import ID'),
      importPayeeName: z.string().nullable().optional().describe('Original import payee name'),
      subtransactions: z
        .array(subtransactionSchema)
        .optional()
        .describe('Split transaction parts'),
      deleted: z.boolean().describe('Whether deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let budgetId = ctx.input.budgetId ?? ctx.config.budgetId;
    let t = await client.getTransaction(budgetId, ctx.input.transactionId);

    let subtransactions = (t.subtransactions ?? []).map((s: any) => ({
      subtransactionId: s.id,
      amount: s.amount,
      memo: s.memo,
      payeeId: s.payee_id,
      payeeName: s.payee_name,
      categoryId: s.category_id,
      categoryName: s.category_name,
      transferAccountId: s.transfer_account_id,
      deleted: s.deleted
    }));

    return {
      output: {
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
        transferTransactionId: t.transfer_transaction_id,
        matchedTransactionId: t.matched_transaction_id,
        importId: t.import_id,
        importPayeeName: t.import_payee_name,
        subtransactions,
        deleted: t.deleted
      },
      message: `Retrieved transaction on **${t.date}** for ${t.amount / 1000} (${t.payee_name ?? 'no payee'})`
    };
  })
  .build();
