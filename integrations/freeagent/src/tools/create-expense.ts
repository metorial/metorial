import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
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
      rebillFactor: z
        .string()
        .optional()
        .describe('Markup percentage or fixed rebill price; required for markup or price'),
      rebillMode: z
        .enum(['cost', 'markup', 'price'])
        .optional()
        .describe('Rebill the project at cost, with a percentage markup, or at a fixed price')
    })
  )
  .output(
    z.object({
      expense: z.record(z.string(), z.any()).describe('The newly created expense record')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.description?.trim()) {
      throw createApiServiceError(
        'FreeAgent requires an expense description. Provide description.'
      );
    }
    if (ctx.input.rebillType !== undefined) {
      throw createApiServiceError(
        'Unbilled and Billed are not FreeAgent rebill modes. Omit rebillType and use rebillMode (cost, markup, or price).'
      );
    }
    if (ctx.input.rebillMode && !ctx.input.projectId) {
      throw createApiServiceError('Provide projectId when setting rebillMode.');
    }
    if (
      (ctx.input.rebillMode === 'markup' || ctx.input.rebillMode === 'price') &&
      ctx.input.rebillFactor === undefined
    ) {
      throw createApiServiceError('Provide rebillFactor for markup or price rebilling.');
    }

    let client = createClient(ctx);

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
    if (ctx.input.rebillMode) expenseData.rebill_type = ctx.input.rebillMode;
    if (ctx.input.rebillFactor) expenseData.rebill_factor = ctx.input.rebillFactor;

    let expense = await client.createExpense(expenseData);

    return {
      output: { expense },
      message: `Created expense of **${ctx.input.grossValue}** on ${ctx.input.datedOn}`
    };
  })
  .build();
