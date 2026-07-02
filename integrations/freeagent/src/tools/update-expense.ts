import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let updateExpense = SlateTool.create(spec, {
  name: 'Update Expense',
  key: 'update_expense',
  description: `Update an existing expense in FreeAgent. Only the provided fields will be changed.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      expenseId: z.string().describe('The FreeAgent expense ID to update'),
      category: z.string().optional().describe('Category URL or nominal code'),
      datedOn: z.string().optional().describe('Expense date in YYYY-MM-DD format'),
      grossValue: z.string().optional().describe('Gross value'),
      description: z.string().optional().describe('Description'),
      currency: z.string().optional().describe('Currency code'),
      salesTaxRate: z.string().optional().describe('Sales tax rate percentage')
    })
  )
  .output(
    z.object({
      expense: z.record(z.string(), z.any()).describe('The updated expense record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let expenseData: Record<string, any> = {};
    if (ctx.input.category) expenseData.category = ctx.input.category;
    if (ctx.input.datedOn) expenseData.dated_on = ctx.input.datedOn;
    if (ctx.input.grossValue) expenseData.gross_value = ctx.input.grossValue;
    if (ctx.input.description !== undefined) expenseData.description = ctx.input.description;
    if (ctx.input.currency) expenseData.currency = ctx.input.currency;
    if (ctx.input.salesTaxRate) expenseData.sales_tax_rate = ctx.input.salesTaxRate;

    let expense = await client.updateExpense(ctx.input.expenseId, expenseData);

    return {
      output: { expense: expense || {} },
      message: `Updated expense **${ctx.input.expenseId}**`
    };
  })
  .build();
