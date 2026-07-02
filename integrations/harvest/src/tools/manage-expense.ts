import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let manageExpense = SlateTool.create(spec, {
  name: 'Manage Expense',
  key: 'manage_expense',
  description: `Create, update, or delete an expense in Harvest. Expenses are associated with projects and expense categories, and can be marked as billable.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      expenseId: z.number().optional().describe('Expense ID (required for update/delete)'),
      projectId: z.number().optional().describe('Project ID (required for create)'),
      expenseCategoryId: z
        .number()
        .optional()
        .describe('Expense category ID (required for create)'),
      spentDate: z
        .string()
        .optional()
        .describe('Date the expense was incurred (YYYY-MM-DD, required for create)'),
      userId: z.number().optional().describe('User ID (defaults to current user)'),
      totalCost: z.number().optional().describe('Total cost of the expense'),
      units: z.number().optional().describe('Number of units (for unit-based categories)'),
      notes: z.string().optional().describe('Expense notes'),
      billable: z.boolean().optional().describe('Whether the expense is billable')
    })
  )
  .output(
    z.object({
      expenseId: z.number().optional().describe('ID of the expense'),
      projectName: z.string().optional().describe('Project name'),
      expenseCategoryName: z.string().optional().describe('Expense category name'),
      spentDate: z.string().optional().describe('Date incurred'),
      totalCost: z.number().optional().describe('Total cost'),
      notes: z.string().optional().nullable().describe('Notes'),
      billable: z.boolean().optional().describe('Whether billable'),
      deleted: z.boolean().optional().describe('Whether the expense was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.expenseId) throw new Error('expenseId is required for delete');
      await client.deleteExpense(ctx.input.expenseId);
      return {
        output: { expenseId: ctx.input.expenseId, deleted: true },
        message: `Deleted expense **#${ctx.input.expenseId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.projectId || !ctx.input.expenseCategoryId || !ctx.input.spentDate) {
        throw new Error('projectId, expenseCategoryId, and spentDate are required for create');
      }
      let exp = await client.createExpense({
        projectId: ctx.input.projectId,
        expenseCategoryId: ctx.input.expenseCategoryId,
        spentDate: ctx.input.spentDate,
        userId: ctx.input.userId,
        totalCost: ctx.input.totalCost,
        units: ctx.input.units,
        notes: ctx.input.notes,
        billable: ctx.input.billable
      });
      return {
        output: {
          expenseId: exp.id,
          projectName: exp.project?.name,
          expenseCategoryName: exp.expense_category?.name,
          spentDate: exp.spent_date,
          totalCost: exp.total_cost,
          notes: exp.notes,
          billable: exp.billable
        },
        message: `Created expense **#${exp.id}** for ${exp.total_cost} on ${exp.spent_date}.`
      };
    }

    // update
    if (!ctx.input.expenseId) throw new Error('expenseId is required for update');
    let exp = await client.updateExpense(ctx.input.expenseId, {
      projectId: ctx.input.projectId,
      expenseCategoryId: ctx.input.expenseCategoryId,
      spentDate: ctx.input.spentDate,
      totalCost: ctx.input.totalCost,
      units: ctx.input.units,
      notes: ctx.input.notes,
      billable: ctx.input.billable
    });
    return {
      output: {
        expenseId: exp.id,
        projectName: exp.project?.name,
        expenseCategoryName: exp.expense_category?.name,
        spentDate: exp.spent_date,
        totalCost: exp.total_cost,
        notes: exp.notes,
        billable: exp.billable
      },
      message: `Updated expense **#${exp.id}** — ${exp.total_cost} on ${exp.spent_date}.`
    };
  })
  .build();
