import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let listExpenses = SlateTool.create(spec, {
  name: 'List Expenses',
  key: 'list_expenses',
  description: `Retrieve a paginated list of expense records from Finmei. Use this to review logged business expenses.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of expenses per page (default: 20, max: 100)')
    })
  )
  .output(
    z.object({
      expenses: z
        .array(
          z.object({
            expenseId: z.string().describe('Expense ID'),
            date: z.string().optional().describe('Expense date'),
            amount: z.number().optional().describe('Expense amount'),
            currency: z.string().optional().describe('Currency code'),
            sellerName: z.string().optional().describe('Seller/vendor name'),
            description: z.string().optional().describe('Expense description'),
            category: z.string().optional().describe('Expense category'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of expenses'),
      total: z.number().optional().describe('Total number of expenses'),
      page: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    let result = await client.listExpenses({
      page: ctx.input.page,
      per_page: ctx.input.perPage
    });

    let rawExpenses = result?.data ?? result?.expenses ?? result ?? [];
    let expensesArray = Array.isArray(rawExpenses) ? rawExpenses : [];

    let expenses = expensesArray.map((e: any) => ({
      expenseId: String(e.id),
      date: e.date,
      amount: e.amount ?? e.price,
      currency: e.currency,
      sellerName: e.seller_name ?? e.seller,
      description: e.description,
      category: e.category,
      createdAt: e.created_at
    }));

    let total = result?.total ?? result?.meta?.total;
    let page = result?.page ?? result?.meta?.current_page ?? ctx.input.page;
    let totalPages = result?.total_pages ?? result?.meta?.last_page;

    return {
      output: {
        expenses,
        total,
        page,
        totalPages
      },
      message: `Found **${expenses.length}** expense(s)${total ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
