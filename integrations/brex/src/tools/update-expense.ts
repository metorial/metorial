import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateExpense = SlateTool.create(spec, {
  name: 'Update Expense',
  key: 'update_expense',
  description: `Update a card expense in Brex. Modify the memo, category, or other editable fields on an expense. Can also be used to retrieve a specific expense by ID when no update fields are provided.`
})
  .input(
    z.object({
      expenseId: z.string().describe('ID of the expense to update or retrieve'),
      memo: z.string().optional().describe('Memo or note to attach to the expense'),
      category: z.string().optional().describe('Expense category to assign')
    })
  )
  .output(
    z.object({
      expenseId: z.string().describe('ID of the expense'),
      memo: z.string().nullable().optional().describe('Updated memo'),
      category: z.string().nullable().optional().describe('Updated category'),
      status: z.string().optional().describe('Payment status'),
      amount: z
        .object({
          amount: z.number().describe('Amount in cents'),
          currency: z.string().nullable().describe('Currency code')
        })
        .optional()
        .describe('Expense amount'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let expense: any;

    let hasUpdates = ctx.input.memo !== undefined || ctx.input.category !== undefined;

    if (hasUpdates) {
      let updateData: Record<string, any> = {};
      if (ctx.input.memo !== undefined) updateData.memo = ctx.input.memo;
      if (ctx.input.category !== undefined) updateData.category = ctx.input.category;

      expense = await client.updateCardExpense(ctx.input.expenseId, updateData);
    } else {
      expense = await client.getCardExpense(ctx.input.expenseId);
    }

    return {
      output: {
        expenseId: expense.id,
        memo: expense.memo,
        category: expense.category,
        status: expense.status ?? expense.payment_status,
        amount: expense.amount
          ? { amount: expense.amount.amount, currency: expense.amount.currency }
          : undefined,
        updatedAt: expense.updated_at
      },
      message: hasUpdates
        ? `Expense **${expense.id}** updated successfully.`
        : `Retrieved expense **${expense.id}**.`
    };
  })
  .build();
