import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteExpense = SlateTool.create(spec, {
  name: 'Delete Expense',
  key: 'delete_expense',
  description: `Delete or restore a Splitwise expense. Deleted expenses can be restored using the restore action.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      expenseId: z.number().describe('The expense ID to delete or restore'),
      action: z
        .enum(['delete', 'restore'])
        .describe('Whether to delete or restore the expense')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'delete') {
      let result = await client.deleteExpense(ctx.input.expenseId);
      return {
        output: { success: result.success !== false },
        message: `Deleted expense ${ctx.input.expenseId}`
      };
    } else {
      let result = await client.restoreExpense(ctx.input.expenseId);
      return {
        output: { success: result.success !== false },
        message: `Restored expense ${ctx.input.expenseId}`
      };
    }
  })
  .build();
