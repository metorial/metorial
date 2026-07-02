import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let updateExpense = SlateTool.create(spec, {
  name: 'Update Expense',
  key: 'update_expense',
  description: `Update an existing logged expense's details such as amount, description, date, or associated job.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      expenseId: z.number().describe('ID of the expense to update'),
      amount: z.number().optional().describe('Updated amount'),
      description: z.string().optional().describe('Updated description'),
      date: z.string().optional().describe('Updated date (YYYY-MM-DD)'),
      jobId: z.number().optional().describe('Updated job ID'),
      jobItemId: z.number().optional().describe('Updated job item ID')
    })
  )
  .output(
    z.object({
      expenseId: z.number().describe('ID of the updated expense'),
      raw: z.record(z.string(), z.any()).describe('Full updated expense object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.amount !== undefined) body.amount = ctx.input.amount;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.date !== undefined) body.date = ctx.input.date;
    if (ctx.input.jobId !== undefined) body.jobId = ctx.input.jobId;
    if (ctx.input.jobItemId !== undefined) body.jobItemId = ctx.input.jobItemId;

    let result = await client.updateLoggedExpense(ctx.input.expenseId, body);

    return {
      output: {
        expenseId: result.id,
        raw: result
      },
      message: `Updated expense (ID: ${result.id}).`
    };
  })
  .build();
