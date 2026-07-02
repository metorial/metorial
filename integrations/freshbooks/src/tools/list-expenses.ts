import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let listExpenses = SlateTool.create(spec, {
  name: 'List Expenses',
  key: 'list_expenses',
  description: `Search and list expenses in FreshBooks. Supports filtering by client, vendor, category, project, date range, and status. Returns paginated results.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25, max: 100)'),
      clientId: z.number().optional().describe('Filter by client ID'),
      categoryId: z.number().optional().describe('Filter by expense category ID'),
      projectId: z.number().optional().describe('Filter by project ID'),
      dateFrom: z
        .string()
        .optional()
        .describe('Filter expenses on or after this date (YYYY-MM-DD)'),
      dateTo: z
        .string()
        .optional()
        .describe('Filter expenses on or before this date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      expenses: z.array(
        z.object({
          expenseId: z.number(),
          amount: z.any().optional(),
          currencyCode: z.string().nullable().optional(),
          date: z.string().nullable().optional(),
          categoryId: z.number().nullable().optional(),
          vendorName: z.string().nullable().optional(),
          clientId: z.number().nullable().optional(),
          notes: z.string().nullable().optional(),
          status: z.number().nullable().optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      totalPages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let params: Record<string, string | number> = {};
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.perPage) params.per_page = ctx.input.perPage;
    if (ctx.input.clientId) params['search[clientid]'] = ctx.input.clientId;
    if (ctx.input.categoryId) params['search[categoryid]'] = ctx.input.categoryId;
    if (ctx.input.projectId) params['search[projectid]'] = ctx.input.projectId;
    if (ctx.input.dateFrom) params['search[date_min]'] = ctx.input.dateFrom;
    if (ctx.input.dateTo) params['search[date_max]'] = ctx.input.dateTo;

    let result = await client.listExpenses(params);

    let expenses = (result.expenses || []).map((e: any) => ({
      expenseId: e.id || e.expenseid,
      amount: e.amount,
      currencyCode: e.currency_code,
      date: e.date,
      categoryId: e.categoryid,
      vendorName: e.vendor,
      clientId: e.clientid,
      notes: e.notes,
      status: e.status
    }));

    return {
      output: {
        expenses,
        totalCount: result.total || 0,
        currentPage: result.page || 1,
        totalPages: result.pages || 1
      },
      message: `Found **${result.total || 0}** expenses (page ${result.page || 1} of ${result.pages || 1}).`
    };
  })
  .build();
