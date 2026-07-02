import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let expenseOutputSchema = z.object({
  expenseId: z.string(),
  date: z.string().optional(),
  projectId: z.string().optional(),
  categoryId: z.string().optional(),
  billable: z.boolean().optional(),
  notes: z.string().optional(),
  totalAmount: z.number().optional(),
  quantity: z.number().optional(),
  userId: z.string().optional()
});

export let createExpense = SlateTool.create(spec, {
  name: 'Create Expense',
  key: 'create_expense',
  description: `Create a new expense entry in Clockify. Assign to a project, set category, amount, and billable status.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      date: z.string().describe('Expense date in ISO 8601 format'),
      projectId: z.string().optional().describe('Project ID to assign the expense to'),
      categoryId: z.string().optional().describe('Expense category ID'),
      quantity: z.number().optional().describe('Quantity (for unit-based categories)'),
      totalAmount: z.number().optional().describe('Total expense amount'),
      billable: z.boolean().optional().describe('Whether the expense is billable'),
      notes: z.string().optional().describe('Notes about the expense')
    })
  )
  .output(expenseOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let expense = await client.createExpense({
      date: ctx.input.date,
      projectId: ctx.input.projectId,
      categoryId: ctx.input.categoryId,
      quantity: ctx.input.quantity,
      totalAmount: ctx.input.totalAmount,
      billable: ctx.input.billable,
      notes: ctx.input.notes
    });

    return {
      output: {
        expenseId: expense.id,
        date: expense.date || undefined,
        projectId: expense.projectId || undefined,
        categoryId: expense.categoryId || undefined,
        billable: expense.billable,
        notes: expense.notes || undefined,
        totalAmount: expense.totalAmount,
        quantity: expense.quantity,
        userId: expense.userId || undefined
      },
      message: `Created expense entry.`
    };
  })
  .build();

export let deleteExpense = SlateTool.create(spec, {
  name: 'Delete Expense',
  key: 'delete_expense',
  description: `Delete an expense entry from Clockify.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      expenseId: z.string().describe('ID of the expense to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    await client.deleteExpense(ctx.input.expenseId);

    return {
      output: { deleted: true },
      message: `Deleted expense **${ctx.input.expenseId}**.`
    };
  })
  .build();
