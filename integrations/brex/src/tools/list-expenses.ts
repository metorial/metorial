import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let expenseSchema = z.object({
  expenseId: z.string().describe('Unique identifier of the expense'),
  merchantName: z.string().nullable().optional().describe('Name of the merchant'),
  merchantCategory: z.string().nullable().optional().describe('Merchant category'),
  amount: z
    .object({
      amount: z.number().describe('Amount in cents'),
      currency: z.string().nullable().describe('Currency code')
    })
    .optional()
    .describe('Expense amount'),
  status: z.string().optional().describe('Payment status'),
  memo: z.string().nullable().optional().describe('Memo or note attached to the expense'),
  category: z.string().nullable().optional().describe('Expense category'),
  purchasedAt: z
    .string()
    .nullable()
    .optional()
    .describe('ISO 8601 timestamp of when the purchase was made'),
  updatedAt: z.string().nullable().optional().describe('ISO 8601 timestamp of last update'),
  userId: z.string().nullable().optional().describe('ID of the user who made the expense'),
  budgetId: z.string().nullable().optional().describe('ID of the associated budget')
});

export let listExpenses = SlateTool.create(spec, {
  name: 'List Expenses',
  key: 'list_expenses',
  description: `List card expenses in your Brex account. Filter by update time to find recently changed expenses. Optionally expand related data like merchant, user, and budget details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      updatedAtStart: z
        .string()
        .optional()
        .describe('Filter expenses updated after this ISO 8601 timestamp'),
      expand: z
        .array(z.enum(['merchant', 'budget', 'user', 'department', 'location', 'receipts']))
        .optional()
        .describe('Related data to include in the response'),
      cursor: z.string().optional().describe('Pagination cursor for fetching next page'),
      limit: z.number().optional().describe('Maximum number of results per page (max 1000)')
    })
  )
  .output(
    z.object({
      expenses: z.array(expenseSchema).describe('List of card expenses'),
      nextCursor: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCardExpenses({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit,
      expand: ctx.input.expand,
      updated_at_start: ctx.input.updatedAtStart
    });

    let expenses = result.items.map((e: any) => ({
      expenseId: e.id,
      merchantName: e.merchant?.raw_descriptor ?? e.merchant_name ?? null,
      merchantCategory: e.merchant?.mcc ?? null,
      amount: e.amount ? { amount: e.amount.amount, currency: e.amount.currency } : undefined,
      status: e.status ?? e.payment_status,
      memo: e.memo,
      category: e.category,
      purchasedAt: e.purchased_at,
      updatedAt: e.updated_at,
      userId: e.user_id ?? e.user?.id,
      budgetId: e.budget_id ?? e.budget?.id
    }));

    return {
      output: {
        expenses,
        nextCursor: result.next_cursor
      },
      message: `Found **${expenses.length}** expense(s).${result.next_cursor ? ' More results available.' : ''}`
    };
  })
  .build();
