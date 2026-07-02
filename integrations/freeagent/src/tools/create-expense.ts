import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let createExpense = SlateTool.create(spec, {
  name: 'Create Expense',
  key: 'create_expense',
  description: `Record a new business expense in FreeAgent. Requires user, category, date, and gross value. Can be linked to a project.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('User ID the expense belongs to'),
      category: z.string().describe('Category URL or nominal code for the expense'),
      datedOn: z.string().describe('Expense date in YYYY-MM-DD format'),
      grossValue: z.string().describe('Gross value of the expense'),
      description: z.string().optional().describe('Description of the expense'),
      nativeGrossValue: z.string().optional().describe('Gross value in original currency'),
      currency: z.string().optional().describe('Currency code (e.g. GBP, EUR, USD)'),
      salesTaxRate: z.string().optional().describe('Sales tax rate percentage'),
      manualSalesTaxAmount: z.string().optional().describe('Manual sales tax amount override'),
      projectId: z.string().optional().describe('Project ID to associate the expense with'),
      rebillType: z
        .enum(['Unbilled', 'Billed'])
        .optional()
        .describe('Whether this expense can be rebilled'),
      rebillFactor: z.string().optional().describe('Rebill markup factor')
    })
  )
  .output(
    z.object({
      expense: z.record(z.string(), z.any()).describe('The newly created expense record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let expenseData: Record<string, any> = {
      user: ctx.input.userId,
      category: ctx.input.category,
      dated_on: ctx.input.datedOn,
      gross_value: ctx.input.grossValue
    };

    if (ctx.input.description) expenseData.description = ctx.input.description;
    if (ctx.input.nativeGrossValue)
      expenseData.native_gross_value = ctx.input.nativeGrossValue;
    if (ctx.input.currency) expenseData.currency = ctx.input.currency;
    if (ctx.input.salesTaxRate) expenseData.sales_tax_rate = ctx.input.salesTaxRate;
    if (ctx.input.manualSalesTaxAmount)
      expenseData.manual_sales_tax_amount = ctx.input.manualSalesTaxAmount;
    if (ctx.input.projectId) expenseData.project = ctx.input.projectId;
    if (ctx.input.rebillType) expenseData.rebill_type = ctx.input.rebillType;
    if (ctx.input.rebillFactor) expenseData.rebill_factor = ctx.input.rebillFactor;

    let expense = await client.createExpense(expenseData);

    return {
      output: { expense },
      message: `Created expense of **${ctx.input.grossValue}** on ${ctx.input.datedOn}`
    };
  })
  .build();
