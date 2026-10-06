import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  budgetInput,
  dateInput,
  idInput,
  invalid,
  milliunits,
  splitSum,
  transactionDate
} from '../lib/validation';
import { spec } from '../spec';
export const subtransactionInput = z.object({
  amount: milliunits.describe('Signed amount in integer milliunits.'),
  payeeId: idInput.optional(),
  payeeName: z.string().max(200).optional(),
  categoryId: idInput.optional(),
  memo: z.string().max(500).optional()
});
export const transactionFields = {
  accountId: idInput.optional(),
  date: dateInput.optional(),
  amount: milliunits.optional(),
  payeeId: idInput.nullable().optional(),
  payeeName: z.string().max(200).nullable().optional(),
  categoryId: idInput.nullable().optional(),
  memo: z.string().max(500).nullable().optional(),
  cleared: z.enum(['cleared', 'uncleared', 'reconciled']).optional(),
  approved: z.boolean().optional(),
  flagColor: z
    .enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple'])
    .nullable()
    .optional(),
  subtransactions: z
    .array(subtransactionInput)
    .min(1)
    .optional()
    .describe(
      'Create a split or convert a non-split transaction. Existing split parts cannot be replaced through the API.'
    )
};
export function transactionBody(t: z.infer<z.ZodObject<typeof transactionFields>>) {
  return {
    account_id: t.accountId,
    date: t.date === undefined ? undefined : transactionDate(t.date),
    amount: t.amount,
    payee_id: t.payeeName != null && !t.payeeId ? null : t.payeeId,
    payee_name: t.payeeName,
    category_id: t.subtransactions ? null : t.categoryId,
    memo: t.memo,
    cleared: t.cleared,
    approved: t.approved,
    flag_color: t.flagColor,
    subtransactions: t.subtransactions?.map(s => ({
      amount: s.amount,
      payee_id: s.payeeId,
      payee_name: s.payeeName,
      category_id: s.categoryId,
      memo: s.memo
    }))
  };
}
const transactionInput = z.object({
  ...transactionFields,
  accountId: idInput.describe('Account ID from list_accounts.'),
  date: dateInput,
  amount: milliunits.describe('Signed integer milliunits; 100000 means 100 currency units.'),
  importId: z
    .string()
    .trim()
    .min(1)
    .max(36)
    .optional()
    .describe(
      'Stable deduplication ID per account, at most 36 characters. Reuse it for retries. Imported transactions may match existing transactions.'
    )
});
export const createTransaction = SlateTool.create(spec, {
  name: 'Create Transaction',
  key: 'create_transaction',
  description:
    'Create one or more transactions, including splits. Amounts are integer milliunits. Import IDs deduplicate within an account and may match existing transactions; returned IDs are saved records, not proof of new ownership.',
  constraints: [
    'Split amounts must sum exactly to the parent amount.',
    'Transaction dates cannot be in the future.',
    'Do not retry an unconfirmed creation blindly; read by import ID first.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      budgetId: budgetInput,
      transactions: z.array(transactionInput).min(1).describe('Transactions to save.')
    })
  )
  .output(
    z.object({
      transactionIds: z
        .array(z.string())
        .describe('IDs reported as saved; imported entries can match existing records.'),
      duplicateImportIds: z.array(z.string()).optional(),
      serverKnowledge: milliunits.nonnegative().optional()
    })
  )
  .handleInvocation(async ctx => {
    const seen = new Set<string>();
    for (const t of ctx.input.transactions) {
      transactionDate(t.date);
      splitSum(t.subtransactions, t.amount);
      if (t.subtransactions && t.categoryId !== undefined && t.categoryId !== null)
        throw invalid('Omit categoryId when providing split parts.');
      if (t.payeeId && t.payeeName != null)
        throw invalid(
          'Provide payeeId or payeeName; YNAB ignores the name when an ID is supplied.'
        );
      for (const s of t.subtransactions ?? [])
        if (s.payeeId && s.payeeName !== undefined)
          throw invalid('Provide payeeId or payeeName for each split part.');
      if (t.importId) {
        const identity = `${t.accountId}:${t.importId}`;
        if (seen.has(identity))
          throw invalid(
            'Use distinct import IDs for transactions in the same account within a request.'
          );
        seen.add(identity);
      }
    }
    const result = await new Client({ token: ctx.auth.token }).createTransactions(
      ctx.input.budgetId ?? ctx.config.budgetId,
      ctx.input.transactions.map(t => ({ ...transactionBody(t), import_id: t.importId }))
    );
    const ids = result.transaction_ids;
    const duplicates = result.duplicate_import_ids ?? [];
    const remainingImports = new Map<string, number>();
    for (const t of ctx.input.transactions)
      if (t.importId)
        remainingImports.set(t.importId, (remainingImports.get(t.importId) ?? 0) + 1);
    const unexpectedDuplicate = duplicates.some(id => {
      const count = remainingImports.get(id) ?? 0;
      if (!count) return true;
      remainingImports.set(id, count - 1);
      return false;
    });
    if (
      new Set(ids).size !== ids.length ||
      unexpectedDuplicate ||
      ids.length + duplicates.length !== ctx.input.transactions.length
    )
      throw createApiServiceError(
        'YNAB returned an ambiguous save receipt. Read the affected accounts before retrying with the same import IDs.',
        { reason: 'ynab_response' }
      );
    return {
      output: {
        transactionIds: ids,
        duplicateImportIds: duplicates.length ? duplicates : undefined,
        serverKnowledge: result.server_knowledge
      },
      message: `YNAB reported ${ids.length} saved record(s) and ${duplicates.length} skipped duplicate(s).`
    };
  })
  .build();
