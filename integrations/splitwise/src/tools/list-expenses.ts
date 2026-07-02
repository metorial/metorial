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
  netBalance: z.string().optional().describe('Net balance for this user in the expense')
});

let expenseSchema = z.object({
  expenseId: z.number().describe('Expense ID'),
  groupId: z.number().nullable().describe('Group ID (null if not in a group)'),
  description: z.string().describe('Expense description'),
  cost: z.string().describe('Total cost of the expense'),
  currencyCode: z.string().describe('Currency code'),
  date: z.string().describe('Date of the expense'),
  createdAt: z.string().describe('Timestamp when created'),
  updatedAt: z.string().optional().describe('Timestamp when last updated'),
  deletedAt: z
    .string()
    .nullable()
    .optional()
    .describe('Timestamp when deleted, null if active'),
  payment: z.boolean().optional().describe('Whether this is a payment/settlement'),
  categoryName: z.string().optional().describe('Expense category name'),
  repeats: z.boolean().optional().describe('Whether the expense recurs'),
  repeatInterval: z.string().optional().describe('Recurrence interval'),
  repayments: z.array(repaymentSchema).optional().describe('Repayment information'),
  users: z.array(expenseUserSchema).optional().describe('Users involved in the expense')
});

export let listExpenses = SlateTool.create(spec, {
  name: 'List Expenses',
  key: 'list_expenses',
  description: `Retrieve expenses for the authenticated user. Filter by group, friend, date range, or update time. Returns expense details including cost, description, category, splits, and repayments.`,
  instructions: [
    'Use `groupId` or `friendId` to narrow results. `groupId` overrides `friendId` if both are specified.',
    'Date filters use ISO 8601 format (e.g., "2024-01-01T00:00:00Z").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.number().optional().describe('Filter to a specific group'),
      friendId: z.number().optional().describe('Filter to expenses with a specific friend'),
      datedAfter: z
        .string()
        .optional()
        .describe('Only return expenses dated after this ISO 8601 timestamp'),
      datedBefore: z
        .string()
        .optional()
        .describe('Only return expenses dated before this ISO 8601 timestamp'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return expenses updated after this ISO 8601 timestamp'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Only return expenses updated before this ISO 8601 timestamp'),
      limit: z.number().optional().describe('Max number of expenses to return (default: 20)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      expenses: z.array(expenseSchema).describe('List of expenses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let expenses = await client.getExpenses({
      group_id: ctx.input.groupId,
      friend_id: ctx.input.friendId,
      dated_after: ctx.input.datedAfter,
      dated_before: ctx.input.datedBefore,
      updated_after: ctx.input.updatedAfter,
      updated_before: ctx.input.updatedBefore,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = (expenses || []).map((e: any) => ({
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
      repeats: e.repeats,
      repeatInterval: e.repeat_interval,
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
      }))
    }));

    return {
      output: { expenses: mapped },
      message: `Found **${mapped.length}** expense(s)`
    };
  })
  .build();
