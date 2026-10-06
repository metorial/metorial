import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapExpense } from '../lib/schemas';
import { exact, fail } from '../lib/validation';
import { spec } from '../spec';

export let updateExpense = SlateTool.create(spec, {
  name: 'Update Expense',
  key: 'update_expense',
  description: `Update a card expense in Brex. Modify the memo on a card expense. The retained category input is unsupported by the current update API and is rejected. Can also be used to retrieve a specific expense by ID when no update fields are provided.`
})
  .input(
    z.object({
      expenseId: z.string().describe('ID of the expense to update or retrieve'),
      memo: z.string().nullable().optional().describe('Memo or note to attach to the expense'),
      category: z
        .string()
        .optional()
        .describe(
          'Retained legacy field; current expense updates support memo only. Rejected before a request.'
        )
        .meta({ deprecated: true })
    })
  )
  .output(
    z.object({
      expenseId: z.string().describe('ID of the expense'),
      memo: z.string().nullable().optional().describe('Updated memo'),
      category: z.string().nullable().optional().describe('Updated category'),
      status: z.string().nullish().describe('Expense status'),
      paymentStatus: z.string().nullish().describe('Separate payment status'),
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
    if (ctx.input.category !== undefined)
      fail(
        'category updates are not supported by the current Brex expense update API. Omit category; memo remains editable.'
      );
    const client = new Client({ token: ctx.auth.token });
    const expense =
      ctx.input.memo !== undefined
        ? await client.updateCardExpense(ctx.input.expenseId, { memo: ctx.input.memo })
        : await client.getCardExpense(ctx.input.expenseId);
    exact(expense.id, ctx.input.expenseId);
    return {
      output: mapExpense(expense),
      message: ctx.input.memo !== undefined ? 'Expense memo updated.' : 'Expense retrieved.'
    };
  })
  .build();
