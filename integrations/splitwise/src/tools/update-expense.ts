import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateExpense = SlateTool.create(spec, {
  name: 'Update Expense',
  key: 'update_expense',
  description: `Update an existing Splitwise expense. Only provide fields you want to change. If any user shares are provided, all shares for the expense will be overwritten with the new values.`,
  instructions: [
    'Only include fields that are changing — unchanged fields can be omitted.',
    'If you provide any shares, you must provide the complete set of shares for all users in the expense.'
  ]
})
  .input(
    z.object({
      expenseId: z.number().describe('The expense ID to update'),
      cost: z.string().optional().describe('Updated total cost'),
      description: z.string().optional().describe('Updated description'),
      groupId: z.number().optional().describe('Updated group ID'),
      currencyCode: z.string().optional().describe('Updated currency code'),
      categoryId: z.number().optional().describe('Updated subcategory ID'),
      date: z.string().optional().describe('Updated date in ISO 8601 format'),
      details: z.string().optional().describe('Updated details/notes'),
      shares: z
        .array(
          z.object({
            userId: z.number().optional().describe('Splitwise user ID'),
            email: z.string().optional().describe('Email (for non-Splitwise users)'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            paidShare: z.string().describe('Amount this user paid'),
            owedShare: z.string().describe('Amount this user owes')
          })
        )
        .optional()
        .describe('Updated shares (overwrites all existing shares)')
    })
  )
  .output(
    z.object({
      expenseId: z.number().describe('Updated expense ID'),
      description: z.string().describe('Expense description'),
      cost: z.string().describe('Total cost'),
      currencyCode: z.string().describe('Currency code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let expenses = await client.updateExpense(ctx.input.expenseId, {
      cost: ctx.input.cost,
      description: ctx.input.description,
      group_id: ctx.input.groupId,
      currency_code: ctx.input.currencyCode,
      category_id: ctx.input.categoryId,
      date: ctx.input.date,
      details: ctx.input.details,
      users: ctx.input.shares?.map(s => ({
        user_id: s.userId,
        email: s.email,
        first_name: s.firstName,
        last_name: s.lastName,
        paid_share: s.paidShare,
        owed_share: s.owedShare
      }))
    });

    let updated = expenses[0];

    return {
      output: {
        expenseId: updated.id,
        description: updated.description,
        cost: updated.cost,
        currencyCode: updated.currency_code
      },
      message: `Updated expense **${updated.description}** — ${updated.cost} ${updated.currency_code}`
    };
  })
  .build();
