import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listExpensesTool = SlateTool.create(spec, {
  name: 'List Expenses',
  key: 'list_expenses',
  description: `Search and list expenses with filtering by status, date range, category, and vendor.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      status: z.enum(['unbilled', 'invoiced', 'reimbursed', 'non-billable']).optional(),
      searchText: z.string().optional(),
      dateFrom: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Filter to date (YYYY-MM-DD)'),
      customerId: z.string().optional().describe('Filter by customer ID'),
      vendorId: z.string().optional().describe('Filter by vendor ID'),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(200)
    })
  )
  .output(
    z.object({
      expenses: z.array(
        z.object({
          expenseId: z.string(),
          date: z.string().optional(),
          accountName: z.string().optional(),
          description: z.string().optional(),
          currencyCode: z.string().optional(),
          total: z.number().optional(),
          customerName: z.string().optional(),
          vendorName: z.string().optional(),
          status: z.string().optional(),
          isBillable: z.boolean().optional(),
          createdTime: z.string().optional()
        })
      ),
      pageContext: z
        .object({
          page: z.number(),
          perPage: z.number(),
          hasMorePage: z.boolean()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let query: Record<string, any> = { page: ctx.input.page, per_page: ctx.input.perPage };
    if (ctx.input.status) query.status = ctx.input.status;
    if (ctx.input.searchText) query.search_text = ctx.input.searchText;
    if (ctx.input.dateFrom) query.date_start = ctx.input.dateFrom;
    if (ctx.input.dateTo) query.date_end = ctx.input.dateTo;
    if (ctx.input.customerId) query.customer_id = ctx.input.customerId;
    if (ctx.input.vendorId) query.vendor_id = ctx.input.vendorId;

    let resp = await client.listExpenses(query);
    let expenses = (resp.expenses || []).map((e: any) => ({
      expenseId: e.expense_id,
      date: e.date,
      accountName: e.account_name,
      description: e.description,
      currencyCode: e.currency_code,
      total: e.total,
      customerName: e.customer_name,
      vendorName: e.vendor_name,
      status: e.status,
      isBillable: e.is_billable,
      createdTime: e.created_time
    }));

    let pageContext = resp.page_context
      ? {
          page: resp.page_context.page,
          perPage: resp.page_context.per_page,
          hasMorePage: resp.page_context.has_more_page
        }
      : undefined;

    return {
      output: { expenses, pageContext },
      message: `Found **${expenses.length}** expense(s) on page ${ctx.input.page}.`
    };
  })
  .build();

export let createExpenseTool = SlateTool.create(spec, {
  name: 'Create Expense',
  key: 'create_expense',
  description: `Record a new expense with category, amount, vendor, and optional customer billing.`,
  instructions: [
    'Provide an accountId (expense category account) and amount.',
    'Set isBillable to true and provide a customerId to bill the expense to a customer.'
  ]
})
  .input(
    z.object({
      accountId: z.string().describe('Expense account/category ID'),
      date: z.string().optional().describe('Expense date (YYYY-MM-DD), defaults to today'),
      amount: z.number().describe('Expense amount'),
      customerId: z.string().optional().describe('Customer to bill this expense to'),
      vendorId: z.string().optional().describe('Vendor associated with expense'),
      isBillable: z.boolean().optional().default(false),
      referenceNumber: z.string().optional(),
      description: z.string().optional(),
      currencyId: z.string().optional(),
      taxId: z.string().optional(),
      projectId: z.string().optional().describe('Link expense to a project')
    })
  )
  .output(
    z.object({
      expenseId: z.string(),
      date: z.string().optional(),
      accountName: z.string().optional(),
      total: z.number().optional(),
      status: z.string().optional(),
      currencyCode: z.string().optional(),
      createdTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    let payload: Record<string, any> = {
      account_id: input.accountId,
      amount: input.amount
    };

    if (input.date) payload.date = input.date;
    if (input.customerId) payload.customer_id = input.customerId;
    if (input.vendorId) payload.vendor_id = input.vendorId;
    if (input.isBillable !== undefined) payload.is_billable = input.isBillable;
    if (input.referenceNumber) payload.reference_number = input.referenceNumber;
    if (input.description) payload.description = input.description;
    if (input.currencyId) payload.currency_id = input.currencyId;
    if (input.taxId) payload.tax_id = input.taxId;
    if (input.projectId) payload.project_id = input.projectId;

    let resp = await client.createExpense(payload);
    let exp = resp.expense;

    return {
      output: {
        expenseId: exp.expense_id,
        date: exp.date,
        accountName: exp.account_name,
        total: exp.total,
        status: exp.status,
        currencyCode: exp.currency_code,
        createdTime: exp.created_time
      },
      message: `Created expense of **${exp.currency_code} ${exp.total}** on ${exp.date}.`
    };
  })
  .build();
