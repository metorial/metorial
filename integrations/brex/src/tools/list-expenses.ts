import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapExpense } from '../lib/schemas';
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
  status: z.string().nullish().describe('Expense status'),
  paymentStatus: z.string().nullish().describe('Separate payment status'),
  billingAmount: z.object({ amount: z.number(), currency: z.string().nullable() }).nullish(),
  receipts: z
    .array(
      z.object({ receiptId: z.string(), fileCount: z.number().int().nonnegative().optional() })
    )
    .optional()
    .describe(
      'Receipt identifiers and the number of provider files; use download_expense_receipt.'
    ),
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
        .describe(
          'Related data to include; receipts returns identifiers and file counts. Use download_expense_receipt for files.'
        ),
      cursor: z.string().optional().describe('Pagination cursor for fetching next page'),
      limit: z.number().optional().describe('Maximum number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      expenses: z.array(expenseSchema).describe('List of card expenses'),
      nextCursor: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).listCardExpenses({
      expand: ctx.input.expand,
      updated_at_start: ctx.input.updatedAtStart,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });
    const expenses = result.items.map(mapExpense);
    return {
      output: { expenses, nextCursor: result.next_cursor },
      message: `Returned ${expenses.length} expenses.`
    };
  })
  .build();
