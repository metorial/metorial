import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let manageExpense = SlateTool.create(spec, {
  name: 'Manage Expense',
  key: 'manage_expense',
  description: `Create or delete an expense record in Finmei. Use this to log business expenses with details like date, amount, seller, and category.`,
  instructions: [
    'To **create** an expense, set action to "create" and provide expense details such as **amount**, **date**, and **sellerName**.',
    'To **delete** an expense, set action to "delete" and provide the **expenseId**.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      expenseId: z.string().optional().describe('Expense ID (required for delete)'),
      date: z.string().optional().describe('Expense date in YYYY-MM-DD format (for create)'),
      amount: z.number().optional().describe('Expense amount (for create)'),
      currency: z.string().optional().describe('Three-letter currency code (for create)'),
      sellerName: z.string().optional().describe('Name of the seller/vendor (for create)'),
      description: z.string().optional().describe('Description of the expense (for create)'),
      category: z.string().optional().describe('Expense category (for create)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      expenseId: z.string().optional().describe('Expense ID'),
      expense: z.any().optional().describe('Expense details (for create action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    if (ctx.input.action === 'delete') {
      if (!ctx.input.expenseId) {
        throw new Error('expenseId is required for delete action');
      }
      await client.deleteExpense(ctx.input.expenseId);

      return {
        output: {
          success: true,
          expenseId: ctx.input.expenseId
        },
        message: `Deleted expense \`${ctx.input.expenseId}\`.`
      };
    }

    // create
    let result = await client.createExpense({
      date: ctx.input.date,
      amount: ctx.input.amount,
      currency: ctx.input.currency,
      seller_name: ctx.input.sellerName,
      description: ctx.input.description,
      category: ctx.input.category
    });

    let expense = result?.data ?? result;
    let expenseId = String(expense?.id ?? '');

    return {
      output: {
        success: true,
        expenseId,
        expense
      },
      message: `Created expense${ctx.input.amount ? ` of **${ctx.input.amount}${ctx.input.currency ? ` ${ctx.input.currency}` : ''}**` : ''} (ID: ${expenseId}).`
    };
  })
  .build();
