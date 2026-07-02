import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoBooksClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let booksManageExpense = SlateTool.create(spec, {
  name: 'Books Manage Expense',
  key: 'books_manage_expense',
  description: `Create, update, delete, or list expenses in Zoho Books. Track business expenses with account categorization, amounts, dates, vendors, and custom fields.`,
  instructions: [
    'The organizationId is required for all Zoho Books operations.',
    'For create, accountId, date, and amount are required.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Zoho Books organization ID'),
      action: z
        .enum(['create', 'update', 'delete', 'get', 'list'])
        .describe('Operation to perform'),
      expenseId: z
        .string()
        .optional()
        .describe('Expense ID (required for update, delete, get)'),
      accountId: z.string().optional().describe('Expense account ID (required for create)'),
      date: z.string().optional().describe('Expense date (YYYY-MM-DD, required for create)'),
      amount: z.number().optional().describe('Expense amount (required for create)'),
      paidThroughAccountId: z
        .string()
        .optional()
        .describe('Account ID through which payment was made'),
      vendorId: z.string().optional().describe('Vendor ID'),
      description: z.string().optional().describe('Expense description'),
      referenceNumber: z.string().optional().describe('Reference number'),
      taxId: z.string().optional().describe('Tax ID to apply'),
      isBillable: z.boolean().optional().describe('Whether the expense is billable'),
      customerId: z.string().optional().describe('Customer ID (for billable expenses)'),
      projectId: z.string().optional().describe('Project ID'),
      currencyId: z.string().optional().describe('Currency ID'),
      page: z.number().optional().describe('Page number (for list action)'),
      perPage: z.number().optional().describe('Records per page (for list action)'),
      status: z.string().optional().describe('Filter by status (for list action)')
    })
  )
  .output(
    z.object({
      expense: z.record(z.string(), z.any()).optional().describe('Expense record'),
      expenses: z.array(z.record(z.string(), z.any())).optional().describe('List of expenses'),
      deleted: z.boolean().optional(),
      hasMorePages: z.boolean().optional(),
      apiMessage: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
    let client = new ZohoBooksClient({
      token: ctx.auth.token,
      datacenter: dc,
      organizationId: ctx.input.organizationId
    });

    if (ctx.input.action === 'list') {
      let result = await client.listExpenses({
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        status: ctx.input.status
      });
      return {
        output: {
          expenses: result?.expenses || [],
          hasMorePages: result?.page_context?.has_more_page ?? false
        },
        message: `Retrieved **${(result?.expenses || []).length}** expenses.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.expenseId) throw zohoServiceError('expenseId is required for get');
      let result = await client.getExpense(ctx.input.expenseId);
      return {
        output: { expense: result?.expense || result },
        message: `Fetched expense **${ctx.input.expenseId}**.`
      };
    }

    let buildData = () => {
      let data: Record<string, any> = {};
      if (ctx.input.accountId) data.account_id = ctx.input.accountId;
      if (ctx.input.date) data.date = ctx.input.date;
      if (ctx.input.amount !== undefined) data.amount = ctx.input.amount;
      if (ctx.input.paidThroughAccountId)
        data.paid_through_account_id = ctx.input.paidThroughAccountId;
      if (ctx.input.vendorId) data.vendor_id = ctx.input.vendorId;
      if (ctx.input.description) data.description = ctx.input.description;
      if (ctx.input.referenceNumber) data.reference_number = ctx.input.referenceNumber;
      if (ctx.input.taxId) data.tax_id = ctx.input.taxId;
      if (ctx.input.isBillable !== undefined) data.is_billable = ctx.input.isBillable;
      if (ctx.input.customerId) data.customer_id = ctx.input.customerId;
      if (ctx.input.projectId) data.project_id = ctx.input.projectId;
      if (ctx.input.currencyId) data.currency_id = ctx.input.currencyId;
      return data;
    };

    if (ctx.input.action === 'create') {
      if (!ctx.input.accountId) throw zohoServiceError('accountId is required for create');
      if (!ctx.input.date) throw zohoServiceError('date is required for create');
      if (ctx.input.amount === undefined)
        throw zohoServiceError('amount is required for create');
      let result = await client.createExpense(buildData());
      let expense = result?.expense;
      return {
        output: { expense, apiMessage: result?.message },
        message: `Created expense of **${expense?.total || ctx.input.amount}** on **${expense?.date || ctx.input.date}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.expenseId) throw zohoServiceError('expenseId is required for update');
      let result = await client.updateExpense(ctx.input.expenseId, buildData());
      return {
        output: { expense: result?.expense, apiMessage: result?.message },
        message: `Updated expense **${ctx.input.expenseId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.expenseId) throw zohoServiceError('expenseId is required for delete');
      let result = await client.deleteExpense(ctx.input.expenseId);
      return {
        output: { deleted: true, apiMessage: result?.message },
        message: `Deleted expense **${ctx.input.expenseId}**.`
      };
    }

    throw zohoServiceError('Invalid Books expense action.');
  })
  .build();
