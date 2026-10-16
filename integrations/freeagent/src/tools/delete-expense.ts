import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let deleteExpense = SlateTool.create(spec, {
  name: 'Delete Expense',
  key: 'delete_expense',
  description: `Permanently delete an expense from FreeAgent. This cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      expenseId: z.string().describe('The FreeAgent expense ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the expense was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.deleteExpense(ctx.input.expenseId);

    return {
      output: { deleted: true },
      message: `Deleted expense **${ctx.input.expenseId}**`
    };
  })
  .build();
