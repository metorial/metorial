import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageExpenses = SlateTool.create(spec, {
  name: 'Manage Expenses',
  key: 'manage_expenses',
  description: `Create, update, list, or retrieve expense records. Also supports listing available expense categories. Expenses include amount, currency, category, and receipt information.`,
  instructions: [
    'Use action "create" to submit a new expense.',
    'Use action "update" to modify an existing expense by providing expenseId.',
    'Use action "get" to retrieve a single expense.',
    'Use action "list" to browse expenses with optional filters.',
    'Use action "list_categories" to view available expense categories.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'list', 'list_categories'])
        .describe('Action to perform'),
      expenseId: z.string().optional().describe('Expense ID (required for get, update)'),
      employmentId: z
        .string()
        .optional()
        .describe('Employment ID (used for create, list, list_categories)'),
      title: z.string().optional().describe('Expense title for create'),
      amount: z.number().optional().describe('Expense amount for create/update'),
      currency: z
        .string()
        .optional()
        .describe('Currency code (e.g., USD, EUR) for create/update'),
      category: z.string().optional().describe('Expense category for create/update'),
      expenseDate: z
        .string()
        .optional()
        .describe('Date of the expense (YYYY-MM-DD) for create'),
      receiptBase64: z.string().optional().describe('Base64-encoded receipt file for create'),
      receiptFileName: z.string().optional().describe('Receipt file name for create'),
      taxAmount: z.number().optional().describe('Tax amount for create/update'),
      reviewedAt: z.string().optional().describe('Review timestamp for update'),
      status: z.string().optional().describe('Filter by status when listing'),
      page: z.number().optional().describe('Page number for list'),
      pageSize: z.number().optional().describe('Page size for list')
    })
  )
  .output(
    z.object({
      expense: z.record(z.string(), z.any()).optional().describe('Single expense record'),
      expenses: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of expense records'),
      categories: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Available expense categories'),
      totalCount: z.number().optional().describe('Total count for list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    if (ctx.input.action === 'create') {
      let data: Record<string, any> = {
        employment_id: ctx.input.employmentId,
        title: ctx.input.title,
        amount: ctx.input.amount,
        currency: ctx.input.currency,
        category: ctx.input.category,
        expense_date: ctx.input.expenseDate
      };
      if (ctx.input.receiptBase64) {
        data.receipt = {
          content: ctx.input.receiptBase64,
          name: ctx.input.receiptFileName
        };
      }
      if (ctx.input.taxAmount !== undefined) data.tax_amount = ctx.input.taxAmount;

      let result = await client.createExpense(data);
      let expense = result?.data ?? result?.expense ?? result;
      return {
        output: { expense },
        message: `Created expense **${ctx.input.title ?? 'untitled'}** for ${ctx.input.amount} ${ctx.input.currency}.`
      };
    }

    if (ctx.input.action === 'update') {
      let data: Record<string, any> = {};
      if (ctx.input.title) data.title = ctx.input.title;
      if (ctx.input.amount !== undefined) data.amount = ctx.input.amount;
      if (ctx.input.currency) data.currency = ctx.input.currency;
      if (ctx.input.category) data.category = ctx.input.category;
      if (ctx.input.taxAmount !== undefined) data.tax_amount = ctx.input.taxAmount;

      let result = await client.updateExpense(ctx.input.expenseId!, data);
      let expense = result?.data ?? result?.expense ?? result;
      return {
        output: { expense },
        message: `Updated expense **${ctx.input.expenseId}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let result = await client.getExpense(ctx.input.expenseId!);
      let expense = result?.data ?? result?.expense ?? result;
      return {
        output: { expense },
        message: `Retrieved expense **${ctx.input.expenseId}**.`
      };
    }

    if (ctx.input.action === 'list_categories') {
      let result = await client.listExpenseCategories({
        employmentId: ctx.input.employmentId,
        expenseId: ctx.input.expenseId
      });
      let categories = result?.data ?? result?.expense_categories ?? [];
      return {
        output: { categories },
        message: `Found **${categories.length}** expense categories.`
      };
    }

    // list
    let result = await client.listExpenses({
      employmentId: ctx.input.employmentId,
      status: ctx.input.status,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });
    let expenses = result?.data ?? result?.expenses ?? [];
    let totalCount = result?.total_count ?? expenses.length;
    return {
      output: { expenses, totalCount },
      message: `Found **${totalCount}** expense(s).`
    };
  });
