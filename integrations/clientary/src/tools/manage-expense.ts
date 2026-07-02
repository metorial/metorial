import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let expenseSchema = z.object({
  expenseId: z.number().describe('Unique ID of the expense'),
  clientId: z.number().optional().describe('Associated client ID'),
  projectId: z.number().optional().describe('Associated project ID'),
  userId: z.number().optional().describe('Staff user ID who recorded the expense'),
  invoiceId: z.number().optional().describe('Invoice ID if rebilled'),
  amount: z.number().describe('Expense amount'),
  date: z.string().optional().describe('Date incurred (YYYY-MM-DD)'),
  description: z.string().optional().describe('Expense description'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let createExpense = SlateTool.create(spec, {
  name: 'Create Expense',
  key: 'create_expense',
  description: `Record a new expense in Clientary. Expenses can optionally be associated with a client and/or project for tracking and rebilling purposes.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      amount: z.number().describe('Expense amount (required)'),
      date: z.string().optional().describe('Date incurred (YYYY-MM-DD)'),
      description: z.string().optional().describe('Description of the expense'),
      clientId: z.number().optional().describe('Client ID to associate with'),
      projectId: z.number().optional().describe('Project ID to associate with')
    })
  )
  .output(expenseSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = { amount: ctx.input.amount };
    if (ctx.input.date) data.date = ctx.input.date;
    if (ctx.input.description) data.description = ctx.input.description;
    if (ctx.input.clientId) data.client_id = ctx.input.clientId;
    if (ctx.input.projectId) data.project_id = ctx.input.projectId;

    let result = await client.createExpense(data);
    let e = result.expense || result;

    return {
      output: mapExpense(e),
      message: `Created expense of **${e.amount}** (ID: ${e.id}).`
    };
  })
  .build();

export let updateExpense = SlateTool.create(spec, {
  name: 'Update Expense',
  key: 'update_expense',
  description: `Update an existing expense's amount, date, description, or associations.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      expenseId: z.number().describe('ID of the expense to update'),
      amount: z.number().optional().describe('Expense amount'),
      date: z.string().optional().describe('Date incurred (YYYY-MM-DD)'),
      description: z.string().optional().describe('Description'),
      clientId: z.number().optional().describe('Client ID'),
      projectId: z.number().optional().describe('Project ID')
    })
  )
  .output(expenseSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {};
    if (ctx.input.amount !== undefined) data.amount = ctx.input.amount;
    if (ctx.input.date !== undefined) data.date = ctx.input.date;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.clientId !== undefined) data.client_id = ctx.input.clientId;
    if (ctx.input.projectId !== undefined) data.project_id = ctx.input.projectId;

    let result = await client.updateExpense(ctx.input.expenseId, data);
    let e = result.expense || result;

    return {
      output: mapExpense(e),
      message: `Updated expense ID ${e.id} — amount: ${e.amount}.`
    };
  })
  .build();

export let getExpenses = SlateTool.create(spec, {
  name: 'Get Expenses',
  key: 'get_expenses',
  description: `Retrieve a specific expense by ID or list expenses. Can be filtered by client, project, or date range. Defaults to current fiscal year.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      expenseId: z
        .number()
        .optional()
        .describe('ID of a specific expense. If omitted, lists expenses.'),
      clientId: z.number().optional().describe('Filter by client ID'),
      projectId: z.number().optional().describe('Filter by project ID'),
      fromDate: z.string().optional().describe('Start of date range (YYYY-MM-DD)'),
      toDate: z.string().optional().describe('End of date range (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      expenses: z.array(expenseSchema).describe('List of expenses'),
      totalCount: z.number().optional().describe('Total number of matching expenses'),
      pageCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    if (ctx.input.expenseId) {
      let result = await client.getExpense(ctx.input.expenseId);
      let e = result.expense || result;
      return {
        output: { expenses: [mapExpense(e)] },
        message: `Retrieved expense ID ${e.id} — amount: ${e.amount}.`
      };
    }

    let result = await client.listExpenses({
      page: ctx.input.page,
      clientId: ctx.input.clientId,
      projectId: ctx.input.projectId,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate
    });

    let expenses = (result.expenses || []).map(mapExpense);

    return {
      output: {
        expenses,
        totalCount: result.total_count,
        pageCount: result.page_count
      },
      message: `Retrieved ${expenses.length} expense(s).`
    };
  })
  .build();

export let deleteExpense = SlateTool.create(spec, {
  name: 'Delete Expense',
  key: 'delete_expense',
  description: `Permanently delete an expense record.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      expenseId: z.number().describe('ID of the expense to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deleteExpense(ctx.input.expenseId);

    return {
      output: { success: true },
      message: `Deleted expense ID ${ctx.input.expenseId}.`
    };
  })
  .build();

let mapExpense = (e: any) => ({
  expenseId: e.id,
  clientId: e.client_id,
  projectId: e.project_id,
  userId: e.user_id,
  invoiceId: e.invoice_id,
  amount: e.amount,
  date: e.date,
  description: e.description,
  createdAt: e.created_at,
  updatedAt: e.updated_at
});
