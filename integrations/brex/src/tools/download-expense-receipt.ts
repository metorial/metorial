import { SlateTool } from 'slates';
import { z } from 'zod';
import { receiptFile } from '../lib/receipts';
import { spec } from '../spec';
export const downloadExpenseReceipt = SlateTool.create(spec, {
  name: 'Download Expense Receipt',
  key: 'download_expense_receipt',
  description:
    'Download an exact receipt file for an expense. Read receipt IDs and file counts with list_expenses using expand receipts. Signed download links are renewed by reading the same expense and receipt again; no banking token is sent to the file host.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      expenseId: z.string(),
      receiptId: z.string(),
      fileIndex: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Zero-based file index within this receipt; defaults to 0.')
    })
  )
  .output(z.object({ expenseId: z.string(), receiptId: z.string(), fileIndex: z.number() }))
  .handleInvocation(async ctx => {
    const reference = {
      expenseId: ctx.input.expenseId,
      receiptId: ctx.input.receiptId,
      fileIndex: ctx.input.fileIndex ?? 0
    };
    const file = await receiptFile(ctx.auth.token, reference);
    await ctx.addAttachment({
      type: 'url',
      url: file.url,
      headers: {},
      query: {},
      refreshReference: reference,
      refreshAt: file.expiresAt
    });
    return { output: reference, message: 'Receipt file prepared for download.' };
  })
  .build();
