import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageExpense = SlateTool.create(spec, {
  name: 'Manage Expense',
  key: 'manage_expense',
  description: `Create, retrieve, or delete employee expenses in Breathe HR. Use **action "create"** to add a new expense, **"get"** to retrieve an existing expense, or **"delete"** to remove one.`,
  instructions: [
    'When creating, employeeId, expenseDate, description, and amount are required.',
    'When getting or deleting, only expenseId is required.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'delete']).describe('The action to perform'),
      expenseId: z.string().optional().describe('Expense ID (required for get and delete)'),
      employeeId: z.string().optional().describe('Employee ID (required for create)'),
      expenseDate: z
        .string()
        .optional()
        .describe('Expense date (format: YYYY/MM/DD, required for create)'),
      description: z
        .string()
        .optional()
        .describe('Description of the expense (required for create)'),
      amount: z
        .string()
        .optional()
        .describe('Expense amount as a string (required for create)'),
      payableToEmployee: z
        .boolean()
        .optional()
        .describe('Whether the expense is reimbursable to the employee'),
      chargeable: z
        .boolean()
        .optional()
        .describe('Whether the expense is chargeable to a client')
    })
  )
  .output(
    z.object({
      expense: z.record(z.string(), z.any()).optional().describe('The expense record'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.employeeId)
        throw new Error('employeeId is required when creating an expense');
      if (!ctx.input.expenseDate)
        throw new Error('expenseDate is required when creating an expense');
      if (!ctx.input.description)
        throw new Error('description is required when creating an expense');
      if (!ctx.input.amount) throw new Error('amount is required when creating an expense');

      let result = await client.createExpense({
        employeeId: ctx.input.employeeId,
        expenseDate: ctx.input.expenseDate,
        description: ctx.input.description,
        amount: ctx.input.amount,
        payableToEmployee: ctx.input.payableToEmployee,
        chargeable: ctx.input.chargeable
      });

      let expense = result?.employee_expenses?.[0] || result?.employee_expense || result;

      return {
        output: { expense, success: true },
        message: `Created expense of **${ctx.input.amount}** for employee **${ctx.input.employeeId}**.`
      };
    }

    if (!ctx.input.expenseId) throw new Error('expenseId is required for get or delete');

    if (ctx.input.action === 'get') {
      let result = await client.getExpense(ctx.input.expenseId);
      let expense = result?.employee_expenses?.[0] || result?.employee_expense || result;

      return {
        output: { expense, success: true },
        message: `Retrieved expense **${ctx.input.expenseId}**.`
      };
    }

    await client.deleteExpense(ctx.input.expenseId);
    return {
      output: { success: true },
      message: `Deleted expense **${ctx.input.expenseId}**.`
    };
  })
  .build();
