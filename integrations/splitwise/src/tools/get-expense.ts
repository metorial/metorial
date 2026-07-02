import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let repaymentSchema = z.object({
  from: z.number().describe('User ID who owes'),
  to: z.number().describe('User ID who is owed'),
  amount: z.string().describe('Repayment amount')
});

let expenseUserSchema = z.object({
  userId: z.number().describe('User ID'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().nullable().optional().describe('Last name'),
  paidShare: z.string().optional().describe('Amount this user paid'),
  owedShare: z.string().optional().describe('Amount this user owes'),
  netBalance: z.string().optional().describe('Net balance for this user')
});

export let getExpense = SlateTool.create(spec, {
  name: 'Get Expense',
  key: 'get_expense',
  description: `Retrieve detailed information about a specific expense, including cost, splits, repayments, category, and comments count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      expenseId: z.number().describe('The expense ID to retrieve')
    })
  )
  .output(
    z.object({
      expenseId: z.number().describe('Expense ID'),
      groupId: z.number().nullable().describe('Group ID'),
      description: z.string().describe('Expense description'),
      cost: z.string().describe('Total cost'),
      currencyCode: z.string().describe('Currency code'),
      date: z.string().describe('Expense date'),
      createdAt: z.string().describe('Created timestamp'),
      updatedAt: z.string().optional().describe('Updated timestamp'),
      deletedAt: z.string().nullable().optional().describe('Deleted timestamp'),
      payment: z.boolean().optional().describe('Whether this is a payment/settlement'),
      categoryName: z.string().optional().describe('Category name'),
      categoryId: z.number().optional().describe('Category ID'),
      details: z.string().nullable().optional().describe('Additional details/notes'),
      repeats: z.boolean().optional().describe('Whether the expense recurs'),
      repeatInterval: z.string().optional().describe('Recurrence interval'),
      commentsCount: z.number().optional().describe('Number of comments'),
      repayments: z.array(repaymentSchema).optional().describe('Repayment information'),
      users: z.array(expenseUserSchema).optional().describe('Users involved'),
      receiptLarge: z.string().nullable().optional().describe('Receipt image URL (large)'),
      receiptOriginal: z
        .string()
        .nullable()
        .optional()
        .describe('Receipt image URL (original)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let e = await client.getExpense(ctx.input.expenseId);

    return {
      output: {
        expenseId: e.id,
        groupId: e.group_id ?? null,
        description: e.description,
        cost: e.cost,
        currencyCode: e.currency_code,
        date: e.date,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
        deletedAt: e.deleted_at ?? null,
        payment: e.payment,
        categoryName: e.category?.name,
        categoryId: e.category?.id,
        details: e.details ?? null,
        repeats: e.repeats,
        repeatInterval: e.repeat_interval,
        commentsCount: e.comments_count,
        repayments: e.repayments?.map((r: any) => ({
          from: r.from,
          to: r.to,
          amount: r.amount
        })),
        users: e.users?.map((u: any) => ({
          userId: u.user?.id ?? u.user_id,
          firstName: u.user?.first_name,
          lastName: u.user?.last_name ?? null,
          paidShare: u.paid_share,
          owedShare: u.owed_share,
          netBalance: u.net_balance
        })),
        receiptLarge: e.receipt?.large ?? null,
        receiptOriginal: e.receipt?.original ?? null
      },
      message: `Retrieved expense **${e.description}** — ${e.cost} ${e.currency_code}`
    };
  })
  .build();
