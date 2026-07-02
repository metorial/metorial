import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageExpenseClaim = SlateTool.create(spec, {
  name: 'Manage Expense Claim',
  key: 'manage_expense_claim',
  description: `Create or update an expense claim in Breathe HR. Use **action "create"** to group expenses into a claim, or **"update"** to change the status of an existing claim.`,
  instructions: [
    'When creating, employeeId is required. Optionally provide expenseIds to include specific expenses.',
    'When updating, claimId and status are required.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update'])
        .describe('The action to perform on the expense claim'),
      employeeId: z.string().optional().describe('Employee ID (required for create)'),
      expenseIds: z
        .array(z.string())
        .optional()
        .describe('List of expense IDs to include in the claim (for create)'),
      claimId: z.string().optional().describe('Expense claim ID (required for update)'),
      status: z.string().optional().describe('New status for the expense claim (for update)')
    })
  )
  .output(
    z.object({
      expenseClaim: z
        .record(z.string(), z.any())
        .optional()
        .describe('The expense claim record'),
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
        throw new Error('employeeId is required when creating an expense claim');

      let result = await client.createExpenseClaim({
        employeeId: ctx.input.employeeId,
        expenseIds: ctx.input.expenseIds
      });

      let expenseClaim =
        result?.employee_expense_claims?.[0] || result?.employee_expense_claim || result;

      return {
        output: { expenseClaim, success: true },
        message: `Created expense claim for employee **${ctx.input.employeeId}**.`
      };
    }

    if (!ctx.input.claimId)
      throw new Error('claimId is required when updating an expense claim');

    let result = await client.updateExpenseClaim(ctx.input.claimId, {
      status: ctx.input.status
    });

    let expenseClaim =
      result?.employee_expense_claims?.[0] || result?.employee_expense_claim || result;

    return {
      output: { expenseClaim, success: true },
      message: `Updated expense claim **${ctx.input.claimId}**.`
    };
  })
  .build();
