import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { EverhourClient } from '../lib/client';
import { spec } from '../spec';

let expenseSchema = z.object({
  expenseId: z.number().describe('Expense ID'),
  amountCents: z.number().describe('Expense amount in cents'),
  billable: z.boolean().optional().describe('Whether the expense is billable'),
  categoryId: z.number().describe('Expense category ID'),
  date: z.string().describe('Expense date (YYYY-MM-DD)'),
  details: z.string().optional().describe('Expense notes'),
  projectId: z.string().optional().describe('Associated project ID'),
  quantity: z.number().optional().describe('Quantity (for unit-based categories)'),
  userId: z.number().optional().describe('User who incurred the expense')
});

export let listExpenses = SlateTool.create(spec, {
  name: 'List Expenses',
  key: 'list_expenses',
  description: `List project expenses, optionally filtered by date range. Also can list available expense categories.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      from: z.iso
        .date()
        .optional()
        .describe('Start date (YYYY-MM-DD), applied to the returned expenses'),
      to: z.iso
        .date()
        .optional()
        .describe('End date (YYYY-MM-DD), applied to the returned expenses'),
      includeCategories: z
        .boolean()
        .optional()
        .describe('If true, also return expense categories')
    })
  )
  .output(
    z.object({
      expenses: z.array(expenseSchema).describe('List of expenses'),
      categories: z
        .array(
          z.object({
            categoryId: z.number().describe('Category ID'),
            name: z.string().describe('Category name'),
            color: z.string().optional().describe('Category color'),
            unitBased: z.boolean().optional().describe('Whether the category is unit-based'),
            unitName: z.string().optional().describe('Unit name (e.g., "Miles")'),
            unitPriceCents: z.number().optional().describe('Price per unit in cents')
          })
        )
        .optional()
        .describe('Expense categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    if (ctx.input.from && ctx.input.to && ctx.input.from > ctx.input.to) {
      throw createApiServiceError('from must be on or before to.');
    }
    let expenses = await client.listExpenses();
    let mapped = expenses
      .filter(
        (e: any) =>
          (!ctx.input.from || e.date >= ctx.input.from) &&
          (!ctx.input.to || e.date <= ctx.input.to)
      )
      .map((e: any) => ({
        expenseId: e.id,
        amountCents: e.amount,
        billable: e.billable ?? undefined,
        categoryId: e.category,
        date: e.date,
        details: e.details ?? undefined,
        projectId: e.project ?? undefined,
        quantity: e.quantity ?? undefined,
        userId: e.user ?? undefined
      }));

    let categories: any;
    if (ctx.input.includeCategories) {
      let cats = await client.listExpenseCategories();
      categories = cats.map((c: any) => ({
        categoryId: c.id,
        name: c.name,
        color: c.color ?? undefined,
        unitBased: c.unitBased ?? undefined,
        unitName: c.unitName ?? undefined,
        unitPriceCents: c.unitPrice ?? undefined
      }));
    }

    return {
      output: { expenses: mapped, categories },
      message: `Found **${mapped.length}** expense(s).`
    };
  });

export let createExpense = SlateTool.create(spec, {
  name: 'Create Expense',
  key: 'create_expense',
  description: `Record a new expense. Amount is in cents. Requires a category ID (use List Expenses with includeCategories to find categories).`,
  tags: { destructive: false }
})
  .input(
    z.object({
      amountCents: z.number().describe('Expense amount in cents'),
      categoryId: z.number().describe('Expense category ID'),
      date: z.string().describe('Expense date (YYYY-MM-DD)'),
      billable: z.boolean().optional().describe('Whether the expense is billable'),
      details: z.string().optional().describe('Notes about the expense'),
      projectId: z.string().optional().describe('Project ID to associate with'),
      quantity: z.number().optional().describe('Quantity for unit-based categories'),
      userId: z.number().optional().describe('User ID who incurred the expense')
    })
  )
  .output(expenseSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let result = await client.createExpense({
      amount: ctx.input.amountCents,
      category: ctx.input.categoryId,
      date: ctx.input.date,
      billable: ctx.input.billable,
      details: ctx.input.details,
      project: ctx.input.projectId,
      quantity: ctx.input.quantity,
      user: ctx.input.userId
    });
    return {
      output: {
        expenseId: result.id,
        amountCents: result.amount,
        billable: result.billable ?? undefined,
        categoryId: result.category,
        date: result.date,
        details: result.details ?? undefined,
        projectId: result.project ?? undefined,
        quantity: result.quantity ?? undefined,
        userId: result.user ?? undefined
      },
      message: `Created expense of **$${(ctx.input.amountCents / 100).toFixed(2)}** on ${ctx.input.date}.`
    };
  });

export let updateExpense = SlateTool.create(spec, {
  name: 'Update Expense',
  key: 'update_expense',
  description: `Update an existing expense's amount, category, date, details, or other fields.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      expenseId: z.number().describe('ID of the expense to update'),
      amountCents: z.number().optional().describe('Updated amount in cents'),
      categoryId: z.number().optional().describe('Updated category ID'),
      date: z.string().optional().describe('Updated date (YYYY-MM-DD)'),
      billable: z.boolean().optional().describe('Updated billable flag'),
      details: z.string().optional().describe('Updated notes'),
      projectId: z.string().optional().describe('Updated project ID'),
      quantity: z.number().optional().describe('Updated quantity'),
      userId: z.number().optional().describe('Updated user ID')
    })
  )
  .output(expenseSchema)
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    let { expenseId, amountCents, categoryId, projectId, userId, ...rest } = ctx.input;
    let result = await client.updateExpense(expenseId, {
      ...rest,
      amount: amountCents,
      category: categoryId,
      project: projectId,
      user: userId
    });
    return {
      output: {
        expenseId: result.id,
        amountCents: result.amount,
        billable: result.billable ?? undefined,
        categoryId: result.category,
        date: result.date,
        details: result.details ?? undefined,
        projectId: result.project ?? undefined,
        quantity: result.quantity ?? undefined,
        userId: result.user ?? undefined
      },
      message: `Updated expense ${expenseId}.`
    };
  });

export let deleteExpense = SlateTool.create(spec, {
  name: 'Delete Expense',
  key: 'delete_expense',
  description: `Permanently delete an expense record.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      expenseId: z.number().describe('ID of the expense to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EverhourClient(ctx.auth.token);
    await client.deleteExpense(ctx.input.expenseId);
    return {
      output: { success: true },
      message: `Deleted expense ${ctx.input.expenseId}.`
    };
  });
