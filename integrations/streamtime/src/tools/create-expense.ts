import { createApiServiceError, SlateTool } from 'slates';
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
      itemName: z.string().optional().describe('Expense item name'),
      costRate: z
        .number()
        .optional()
        .describe('Cost per unit in expense currency. Alternative to amount.'),
      sellRate: z.number().optional().describe('Sell price per unit in expense currency'),
      quantity: z
        .number()
        .optional()
        .describe('Expense quantity. amount is a total cost and uses quantity 1.'),
      itemPricingMethodId: z.number().optional().describe('Expense pricing method ID'),
      amount: z
        .number()
        .optional()
        .describe('Total expense cost. Sent as costRate with quantity 1.'),
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
    if (
      ctx.input.amount !== undefined &&
      (ctx.input.costRate !== undefined ||
        (ctx.input.quantity !== undefined && ctx.input.quantity !== 1))
    ) {
      throw createApiServiceError(
        'Provide amount for a total cost at quantity 1, or costRate and quantity for unit pricing.'
      );
    }
    if (ctx.input.amount !== undefined) {
      body.costRate = ctx.input.amount;
      body.quantity = 1;
    }
    if (ctx.input.costRate !== undefined) body.costRate = ctx.input.costRate;
    if (ctx.input.sellRate !== undefined) body.sellRate = ctx.input.sellRate;
    if (ctx.input.quantity !== undefined) body.quantity = ctx.input.quantity;
    if (ctx.input.itemName !== undefined) body.itemName = ctx.input.itemName;
    if (ctx.input.itemPricingMethodId !== undefined)
      body.itemPricingMethodId = ctx.input.itemPricingMethodId;
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
