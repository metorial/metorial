import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createExpense = SlateTool.create(spec, {
  name: 'Create Expense',
  key: 'create_expense',
  description: `Create a new expense record in Agiled. Track business expenses with an amount, category, date, and optional project association.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      itemName: z.string().describe('Name or description of the expense'),
      price: z.number().describe('Expense amount'),
      purchaseDate: z.string().optional().describe('Date of purchase (YYYY-MM-DD)'),
      projectId: z.string().optional().describe('Associated project ID'),
      currencyId: z.string().optional().describe('Currency ID'),
      categoryId: z.string().optional().describe('Expense category ID'),
      description: z.string().optional().describe('Detailed description of the expense')
    })
  )
  .output(
    z.object({
      expenseId: z.string().describe('ID of the created expense'),
      itemName: z.string().describe('Expense name'),
      price: z.number().optional().describe('Expense amount')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    let result = await client.createExpense({
      item_name: ctx.input.itemName,
      price: ctx.input.price,
      purchase_date: ctx.input.purchaseDate,
      project_id: ctx.input.projectId,
      currency_id: ctx.input.currencyId,
      category_id: ctx.input.categoryId,
      description: ctx.input.description
    });

    let expense = result.data;

    return {
      output: {
        expenseId: String(expense.id ?? ''),
        itemName: String(expense.item_name ?? ctx.input.itemName),
        price: (expense.price as number | undefined) ?? ctx.input.price
      },
      message: `Created expense **${ctx.input.itemName}** ($${ctx.input.price}).`
    };
  })
  .build();
