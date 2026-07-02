import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listExpenses = SlateTool.create(spec, {
  name: 'List Expenses',
  key: 'list_expenses',
  description: `Lists expenses in Zoho Invoice with optional filtering by status, customer, date, and more.
Supports pagination via **page** and **perPage** parameters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['unbilled', 'invoiced', 'reimbursed'])
        .optional()
        .describe('Filter expenses by status'),
      customerName: z.string().optional().describe('Filter expenses by customer name'),
      description: z.string().optional().describe('Filter expenses by description'),
      referenceNumber: z.string().optional().describe('Filter expenses by reference number'),
      date: z.string().optional().describe('Filter expenses by date in YYYY-MM-DD format'),
      amount: z.string().optional().describe('Filter expenses by amount'),
      searchText: z.string().optional().describe('Search text to filter expenses'),
      sortColumn: z
        .string()
        .optional()
        .describe('Column to sort results by (e.g. date, amount, total, customer_name)'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of expenses per page (max 200)')
    })
  )
  .output(
    z.object({
      expenses: z
        .array(
          z.object({
            expenseId: z.string().describe('Unique ID of the expense'),
            date: z.string().describe('Expense date'),
            amount: z.number().describe('Expense amount'),
            total: z.number().describe('Total expense amount including tax'),
            isBillable: z.boolean().describe('Whether the expense is billable'),
            referenceNumber: z.string().describe('Reference number of the expense'),
            description: z.string().describe('Description of the expense'),
            customerName: z.string().describe('Name of the associated customer'),
            status: z.string().describe('Status of the expense'),
            createdTime: z.string().describe('Timestamp when the expense was created')
          })
        )
        .describe('Array of expense records'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Number of results per page'),
      hasMorePages: z.boolean().describe('Whether more pages are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let params: Record<string, any> = {};

    if (ctx.input.status !== undefined) params.status = ctx.input.status;
    if (ctx.input.customerName !== undefined) params.customer_name = ctx.input.customerName;
    if (ctx.input.description !== undefined) params.description = ctx.input.description;
    if (ctx.input.referenceNumber !== undefined)
      params.reference_number = ctx.input.referenceNumber;
    if (ctx.input.date !== undefined) params.date = ctx.input.date;
    if (ctx.input.amount !== undefined) params.amount = ctx.input.amount;
    if (ctx.input.searchText !== undefined) params.search_text = ctx.input.searchText;
    if (ctx.input.sortColumn !== undefined) params.sort_column = ctx.input.sortColumn;
    if (ctx.input.page !== undefined) params.page = ctx.input.page;
    if (ctx.input.perPage !== undefined) params.per_page = ctx.input.perPage;

    let result = await client.listExpenses(params);

    let expenses = (result.expenses ?? []).map((e: any) => ({
      expenseId: e.expense_id ?? '',
      date: e.date ?? '',
      amount: e.amount ?? 0,
      total: e.total ?? 0,
      isBillable: e.is_billable ?? false,
      referenceNumber: e.reference_number ?? '',
      description: e.description ?? '',
      customerName: e.customer_name ?? '',
      status: e.status ?? '',
      createdTime: e.created_time ?? ''
    }));

    let pageContext = result.pageContext ?? {};

    return {
      output: {
        expenses,
        page: pageContext.page ?? 1,
        perPage: pageContext.per_page ?? 200,
        hasMorePages: pageContext.has_more_page ?? false
      },
      message: `Retrieved **${expenses.length}** expense(s).${pageContext.has_more_page ? ' More pages are available.' : ''}`
    };
  })
  .build();
