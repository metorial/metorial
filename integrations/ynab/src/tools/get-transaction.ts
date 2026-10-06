import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTransaction } from '../lib/models';
import { budgetInput, idInput, milliunits } from '../lib/validation';
import { spec } from '../spec';

let subtransactionSchema = z.object({
  subtransactionId: z.string().describe('Subtransaction ID'),
  amount: milliunits.describe('Amount in milliunits'),
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
      budgetId: budgetInput,
      transactionId: idInput.describe('Transaction ID to retrieve')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      date: z.string().describe('Transaction date'),
      amount: milliunits.describe('Amount in milliunits'),
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
    const transaction = await new Client({ token: ctx.auth.token }).getTransaction(
      ctx.input.budgetId ?? ctx.config.budgetId,
      ctx.input.transactionId
    );
    return {
      output: mapTransaction(transaction),
      message: `Retrieved transaction ${transaction.id}: ${transaction.amount} milliunits.`
    };
  })
  .build();
