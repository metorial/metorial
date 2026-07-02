import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let listExpenses = SlateTool.create(spec, {
  name: 'List Expenses',
  key: 'list_expenses',
  description: `Retrieve expenses with optional filtering by user, client, project, billing status, and date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().optional().describe('Filter by user ID'),
      clientId: z.number().optional().describe('Filter by client ID'),
      projectId: z.number().optional().describe('Filter by project ID'),
      isBilled: z.boolean().optional().describe('Filter by billed status'),
      from: z.string().optional().describe('Start of date range (YYYY-MM-DD)'),
      to: z.string().optional().describe('End of date range (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page (max 2000)')
    })
  )
  .output(
    z.object({
      expenses: z.array(
        z.object({
          expenseId: z.number().describe('Expense ID'),
          userId: z.number().optional().describe('User ID'),
          userName: z.string().optional().describe('User name'),
          projectId: z.number().optional().describe('Project ID'),
          projectName: z.string().optional().describe('Project name'),
          clientName: z.string().optional().describe('Client name'),
          expenseCategoryName: z.string().optional().describe('Category name'),
          spentDate: z.string().describe('Date incurred'),
          totalCost: z.number().describe('Total cost'),
          notes: z.string().nullable().describe('Notes'),
          billable: z.boolean().describe('Whether billable'),
          isBilled: z.boolean().describe('Whether billed')
        })
      ),
      totalEntries: z.number().describe('Total expenses'),
      totalPages: z.number().describe('Total pages'),
      page: z.number().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.listExpenses({
      userId: ctx.input.userId,
      clientId: ctx.input.clientId,
      projectId: ctx.input.projectId,
      isBilled: ctx.input.isBilled,
      from: ctx.input.from,
      to: ctx.input.to,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let expenses = result.results.map((e: any) => ({
      expenseId: e.id,
      userId: e.user?.id,
      userName: e.user?.name,
      projectId: e.project?.id,
      projectName: e.project?.name,
      clientName: e.client?.name,
      expenseCategoryName: e.expense_category?.name,
      spentDate: e.spent_date,
      totalCost: e.total_cost,
      notes: e.notes,
      billable: e.billable,
      isBilled: e.is_billed
    }));

    return {
      output: {
        expenses,
        totalEntries: result.totalEntries,
        totalPages: result.totalPages,
        page: result.page
      },
      message: `Found **${result.totalEntries}** expenses (page ${result.page}/${result.totalPages}).`
    };
  })
  .build();
