import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient, readEntity, requireId } from '../lib/client';
import { spec } from '../spec';

export let downloadExpenseFile = SlateTool.create(spec, {
  key: 'download_expense_file',
  name: 'Download Expense File',
  description:
    'Prepare the original PDF or image receipt for download. Use list_expenses to find the expense ID.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ expenseId: z.string().describe('Expense ID from list_expenses') }))
  .output(z.object({ expenseId: z.string() }))
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);
    let expense = readEntity(await client.getExpense(ctx.input.expenseId), 'expense');
    let expenseId = requireId(expense.id, 'expense ID');
    await ctx.addAttachment({
      type: 'url',
      url: client.downloadUrl('expenses', ctx.input.expenseId),
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });
    return {
      output: { expenseId },
      message: `Prepared the receipt for expense \`${expenseId}\` for download.`
    };
  })
  .build();
