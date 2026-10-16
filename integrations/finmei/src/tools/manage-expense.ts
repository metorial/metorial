import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient, readEntity, requireId } from '../lib/client';
import { spec } from '../spec';

export let manageExpense = SlateTool.create(spec, {
  name: 'Manage Expense',
  key: 'manage_expense',
  description: `Create, update, replace a receipt, or delete an expense record in Finmei. Use this to log business expenses with details like date, amount, seller, and receipt.`,
  instructions: [
    'To **create** an expense, set action to "create" and provide expense details such as **amount**, **date**, and **sellerName**, plus the receipt **file**.',
    'To **update** an expense, provide expenseId plus date, amount, currency, and sellerName. Use update_file with expenseId and file to replace only the receipt.',
    'To **delete** an expense, set action to "delete" and provide the **expenseId**.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'delete', 'update', 'update_file'])
        .describe('Action to perform'),
      expenseId: z
        .string()
        .optional()
        .describe('Expense ID (required for delete, update, and update_file)'),
      file: z
        .object({
          base64: z.string().describe('Base64-encoded PDF or image receipt'),
          filename: z.string().describe('Receipt filename'),
          mimeType: z.string().optional().describe('Receipt MIME type')
        })
        .optional()
        .describe('Required receipt for create and update_file'),
      date: z
        .string()
        .optional()
        .describe('Expense date in YYYY-MM-DD format (for create or update)'),
      amount: z.number().optional().describe('Expense amount (for create or update)'),
      currency: z
        .string()
        .optional()
        .describe('Three-letter currency code (for create or update)'),
      sellerName: z
        .string()
        .optional()
        .describe('Name of the seller/vendor (for create or update)'),
      description: z
        .string()
        .optional()
        .describe('Description of the expense (for create or update)'),
      category: z.string().optional().describe('Expense category (for create or update)')
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
        throw createApiServiceError('expenseId is required for delete action');
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

    if (ctx.input.action === 'update_file') {
      if (!ctx.input.expenseId || !ctx.input.file)
        throw createApiServiceError('Provide expenseId and file to replace a receipt.');
      let result = await client.updateExpenseFile(ctx.input.expenseId, ctx.input.file);
      let expense = readEntity(result, 'expense');
      return {
        output: { success: true, expenseId: requireId(expense.id, 'expense ID'), expense },
        message: `Updated receipt for expense \`${ctx.input.expenseId}\`.`
      };
    }
    if (
      !ctx.input.date ||
      ctx.input.amount === undefined ||
      !ctx.input.currency?.trim() ||
      !ctx.input.sellerName?.trim()
    )
      throw createApiServiceError(
        'Provide date, amount, currency, and sellerName for create or update.'
      );
    let data = {
      date: ctx.input.date,
      total: ctx.input.amount,
      currency: ctx.input.currency,
      seller: ctx.input.sellerName,
      description: ctx.input.description,
      category: ctx.input.category
    };
    let result: unknown;
    if (ctx.input.action === 'update') {
      if (!ctx.input.expenseId)
        throw createApiServiceError('Provide expenseId to update an expense.');
      result = await client.updateExpense(ctx.input.expenseId, data);
    } else {
      if (!ctx.input.file)
        throw createApiServiceError(
          'Provide a PDF or image receipt in file when creating an expense.'
        );
      result = await client.createExpense(data, ctx.input.file);
    }

    let expense = readEntity(result, 'expense');
    let expenseId = requireId(expense.id, 'expense ID');

    return {
      output: {
        success: true,
        expenseId,
        expense
      },
      message: `${ctx.input.action === 'update' ? 'Updated' : 'Created'} expense${ctx.input.amount ? ` of **${ctx.input.amount}${ctx.input.currency ? ` ${ctx.input.currency}` : ''}**` : ''} (ID: ${expenseId}).`
    };
  })
  .build();
