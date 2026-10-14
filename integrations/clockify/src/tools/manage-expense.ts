import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
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
  description: `Create a new expense entry in Clockify. Assign to a project, set category, amount, and billable status. Call get_workspaces to discover the workspace ID.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      date: z.string().describe('Expense date in ISO 8601 format'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID to assign the expense to, required by Clockify'),
      categoryId: z.string().optional().describe('Expense category ID, required by Clockify'),
      quantity: z.number().optional().describe('Quantity (for unit-based categories)'),
      totalAmount: z.number().optional().describe('Total expense amount'),
      billable: z.boolean().optional().describe('Whether the expense is billable'),
      notes: z.string().optional().describe('Notes about the expense'),
      userId: z
        .string()
        .optional()
        .describe('Expense owner. Defaults to the authenticated user.'),
      receipt: z
        .object({
          fileName: z.string().min(1).describe('Receipt filename'),
          contentBase64: z
            .string()
            .min(1)
            .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)
            .describe('Receipt file content encoded as base64'),
          mimeType: z.string().optional().describe('Receipt MIME type')
        })
        .optional()
        .describe('Receipt file, required by the Clockify expense API')
    })
  )
  .output(expenseOutputSchema)
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    let expense = await client.createExpense({
      date: ctx.input.date,
      projectId: ctx.input.projectId,
      categoryId: ctx.input.categoryId,
      quantity: ctx.input.quantity,
      totalAmount: ctx.input.totalAmount,
      billable: ctx.input.billable,
      notes: ctx.input.notes,
      userId: ctx.input.userId,
      receipt: ctx.input.receipt
    });

    return {
      output: {
        expenseId: expense.id,
        date: expense.date || undefined,
        projectId: expense.projectId || undefined,
        categoryId: expense.categoryId || undefined,
        billable: expense.billable ?? undefined,
        notes: expense.notes || undefined,
        totalAmount: expense.total ?? expense.totalAmount ?? undefined,
        quantity: expense.quantity ?? undefined,
        userId: expense.userId || undefined
      },
      message: `Created expense entry.`
    };
  })
  .build();

export let deleteExpense = SlateTool.create(spec, {
  name: 'Delete Expense',
  key: 'delete_expense',
  description: `Delete an expense entry from Clockify. Call get_workspaces to discover the workspace ID.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      expenseId: z.string().describe('ID of the expense to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    await client.deleteExpense(ctx.input.expenseId);

    return {
      output: { deleted: true },
      message: `Deleted expense **${ctx.input.expenseId}**.`
    };
  })
  .build();
