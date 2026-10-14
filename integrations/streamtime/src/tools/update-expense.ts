import { createApiServiceError, SlateTool } from 'slates';
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
        .describe('Updated total expense cost. Sent as costRate with quantity 1.'),
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
