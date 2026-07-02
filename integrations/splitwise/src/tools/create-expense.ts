import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createExpense = SlateTool.create(spec, {
  name: 'Create Expense',
  key: 'create_expense',
  description: `Create a new expense in Splitwise. You can either split it equally among a group, or provide custom paid/owed shares per user. For equal splits, supply a \`groupId\` and set \`splitEqually\` to true. For custom splits, provide a \`shares\` array with each user's paid and owed amounts.`,
  instructions: [
    'For equal group splits, `groupId` is required and the authenticated user is assumed to be the payer.',
    'For custom splits, each share must include `paidShare` and `owedShare` as string amounts (e.g., "25.00"). The sum of `paidShare` values must equal the total cost, and the sum of `owedShare` values must equal the total cost.',
    'Users can be identified by `userId` or by `email` and `firstName` (for non-Splitwise users).',
    'Use a subcategory ID for `categoryId` — parent categories are not accepted.'
  ]
})
  .input(
    z.object({
      cost: z.string().describe('Total cost as a decimal string (e.g., "50.00")'),
      description: z.string().describe('Description of the expense'),
      groupId: z.number().optional().describe('Group ID to associate this expense with'),
      currencyCode: z
        .string()
        .optional()
        .describe('Currency code (e.g., "USD"). Defaults to user default.'),
      categoryId: z.number().optional().describe('Subcategory ID for the expense'),
      date: z.string().optional().describe('Expense date in ISO 8601 format'),
      details: z.string().optional().describe('Additional details or notes'),
      repeatInterval: z
        .enum(['never', 'weekly', 'fortnightly', 'monthly', 'yearly'])
        .optional()
        .describe('Recurrence interval'),
      splitEqually: z
        .boolean()
        .optional()
        .describe('Split the expense equally among the group (requires groupId)'),
      shares: z
        .array(
          z.object({
            userId: z.number().optional().describe('Splitwise user ID'),
            email: z.string().optional().describe('Email address (for non-Splitwise users)'),
            firstName: z.string().optional().describe('First name (required with email)'),
            lastName: z.string().optional().describe('Last name (optional with email)'),
            paidShare: z.string().describe('Amount this user paid (e.g., "50.00")'),
            owedShare: z.string().describe('Amount this user owes (e.g., "25.00")')
          })
        )
        .optional()
        .describe('Custom shares per user (required if splitEqually is false)')
    })
  )
  .output(
    z.object({
      expenseId: z.number().describe('Created expense ID'),
      description: z.string().describe('Expense description'),
      cost: z.string().describe('Total cost'),
      currencyCode: z.string().describe('Currency code'),
      date: z.string().optional().describe('Expense date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let expenses: any[];

    if (ctx.input.splitEqually && ctx.input.groupId) {
      expenses = await client.createExpenseEqualSplit({
        cost: ctx.input.cost,
        description: ctx.input.description,
        group_id: ctx.input.groupId,
        currency_code: ctx.input.currencyCode,
        category_id: ctx.input.categoryId,
        date: ctx.input.date,
        details: ctx.input.details,
        repeat_interval: ctx.input.repeatInterval
      });
    } else if (ctx.input.shares && ctx.input.shares.length > 0) {
      expenses = await client.createExpenseByShares({
        cost: ctx.input.cost,
        description: ctx.input.description,
        group_id: ctx.input.groupId,
        currency_code: ctx.input.currencyCode,
        category_id: ctx.input.categoryId,
        date: ctx.input.date,
        details: ctx.input.details,
        repeat_interval: ctx.input.repeatInterval,
        users: ctx.input.shares.map(s => ({
          user_id: s.userId,
          email: s.email,
          first_name: s.firstName,
          last_name: s.lastName,
          paid_share: s.paidShare,
          owed_share: s.owedShare
        }))
      });
    } else {
      throw new Error('Either set splitEqually with a groupId, or provide custom shares.');
    }

    let created = expenses[0];

    return {
      output: {
        expenseId: created.id,
        description: created.description,
        cost: created.cost,
        currencyCode: created.currency_code,
        date: created.date
      },
      message: `Created expense **${created.description}** for ${created.cost} ${created.currency_code}`
    };
  })
  .build();
