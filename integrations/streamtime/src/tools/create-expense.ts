import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let createExpense = SlateTool.create(spec, {
  name: 'Create Expense',
  key: 'create_expense',
  description: `Log a new expense in Streamtime. Expenses can be associated with jobs and phases, and linked to supplier contacts.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      jobId: z.number().optional().describe('ID of the job this expense belongs to'),
      jobItemId: z
        .number()
        .optional()
        .describe('ID of the job item (line item) this expense is for'),
      amount: z.number().optional().describe('Expense amount'),
      description: z.string().optional().describe('Description of the expense'),
      date: z.string().optional().describe('Date of the expense (YYYY-MM-DD)'),
      supplierContactId: z.number().optional().describe('ID of the supplier contact')
    })
  )
  .output(
    z.object({
      expenseId: z.number().describe('ID of the newly created expense'),
      raw: z.record(z.string(), z.any()).describe('Full expense object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.jobId !== undefined) body.jobId = ctx.input.jobId;
    if (ctx.input.jobItemId !== undefined) body.jobItemId = ctx.input.jobItemId;
    if (ctx.input.amount !== undefined) body.amount = ctx.input.amount;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.date !== undefined) body.date = ctx.input.date;
    if (ctx.input.supplierContactId !== undefined)
      body.supplierContactId = ctx.input.supplierContactId;

    let result = await client.createLoggedExpense(body);

    return {
      output: {
        expenseId: result.id,
        raw: result
      },
      message: `Created expense (ID: ${result.id})${ctx.input.description ? `: ${ctx.input.description}` : ''}.`
    };
  })
  .build();
