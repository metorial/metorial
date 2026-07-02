import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let expenseOutputSchema = z.object({
  expenseId: z.number().describe('Expense ID'),
  projectId: z.number().describe('Parent project ID'),
  date: z.string().optional().describe('Expense date'),
  title: z.string().optional().describe('Expense title'),
  quantity: z.number().optional().describe('Quantity'),
  unit: z.string().optional().describe('Unit label'),
  unitPrice: z.number().optional().describe('Unit price'),
  unitCost: z.number().optional().describe('Unit cost'),
  netTotal: z.number().optional().describe('Net total'),
  billable: z.boolean().optional().describe('Whether the expense is billable'),
  billed: z.boolean().optional().describe('Whether the expense has been billed'),
  budgetRelevant: z.boolean().optional().describe('Whether the expense counts toward budget'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapExpense = (e: any, projectId: number) => ({
  expenseId: e.id,
  projectId,
  date: e.date,
  title: e.title,
  quantity: e.quantity,
  unit: e.unit,
  unitPrice: e.unit_price,
  unitCost: e.unit_cost,
  netTotal: e.net_total,
  billable: e.billable,
  billed: e.billed,
  budgetRelevant: e.budget_relevant,
  createdAt: e.created_at,
  updatedAt: e.updated_at
});

export let listProjectExpenses = SlateTool.create(spec, {
  name: 'List Project Expenses',
  key: 'list_project_expenses',
  description: `Retrieve expenses for a specific project. Filter by billing status, budget relevance, or user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID to list expenses for'),
      billable: z.boolean().optional().describe('Filter by billable status'),
      billed: z.boolean().optional().describe('Filter by billed status'),
      budgetRelevant: z.boolean().optional().describe('Filter by budget relevance'),
      userId: z.number().optional().describe('Filter by user ID')
    })
  )
  .output(
    z.object({
      expenses: z.array(expenseOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let params: Record<string, any> = {};
    if (ctx.input.billable !== undefined) params.billable = ctx.input.billable;
    if (ctx.input.billed !== undefined) params.billed = ctx.input.billed;
    if (ctx.input.budgetRelevant !== undefined)
      params.budget_relevant = ctx.input.budgetRelevant;
    if (ctx.input.userId) params.user_id = ctx.input.userId;

    let data = await client.listProjectExpenses(ctx.input.projectId, params);
    let expenses = (data as any[]).map(e => mapExpense(e, ctx.input.projectId));

    return {
      output: { expenses },
      message: `Found **${expenses.length}** expenses for project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let createProjectExpense = SlateTool.create(spec, {
  name: 'Create Project Expense',
  key: 'create_project_expense',
  description: `Add an expense to a project. Requires date, title, quantity, unit, unit price, and unit cost.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID to add the expense to'),
      date: z.string().describe('Expense date (YYYY-MM-DD)'),
      title: z.string().describe('Expense title/description'),
      quantity: z.number().describe('Quantity'),
      unit: z.string().describe('Unit label (e.g., "pieces", "hours", "km")'),
      unitPrice: z.number().describe('Unit selling price'),
      unitCost: z.number().describe('Unit cost price'),
      billable: z.boolean().optional().describe('Whether the expense is billable'),
      budgetRelevant: z
        .boolean()
        .optional()
        .describe('Whether the expense counts toward budget'),
      description: z.string().optional().describe('Additional description')
    })
  )
  .output(expenseOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {
      date: ctx.input.date,
      title: ctx.input.title,
      quantity: ctx.input.quantity,
      unit: ctx.input.unit,
      unit_price: ctx.input.unitPrice,
      unit_cost: ctx.input.unitCost
    };

    if (ctx.input.billable !== undefined) data.billable = ctx.input.billable;
    if (ctx.input.budgetRelevant !== undefined)
      data.budget_relevant = ctx.input.budgetRelevant;
    if (ctx.input.description) data.description = ctx.input.description;

    let e = await client.createProjectExpense(ctx.input.projectId, data);

    return {
      output: mapExpense(e, ctx.input.projectId),
      message: `Created expense **${e.title}** (ID: ${e.id}) in project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let deleteProjectExpense = SlateTool.create(spec, {
  name: 'Delete Project Expense',
  key: 'delete_project_expense',
  description: `Delete a project expense. Only unbilled expenses can be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID'),
      expenseId: z.number().describe('The expense ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    await client.deleteProjectExpense(ctx.input.projectId, ctx.input.expenseId);

    return {
      output: { success: true },
      message: `Deleted expense **${ctx.input.expenseId}** from project **${ctx.input.projectId}**.`
    };
  })
  .build();
