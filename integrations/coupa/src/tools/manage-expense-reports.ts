import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

let expenseReportOutputSchema = z.object({
  expenseReportId: z.number().describe('Coupa internal expense report ID'),
  title: z.string().nullable().optional().describe('Expense report title'),
  status: z.string().nullable().optional().describe('Expense report status'),
  expenseReportNumber: z.string().nullable().optional().describe('Expense report number'),
  submittedBy: z.any().nullable().optional().describe('Submitting user'),
  totalAmount: z.any().nullable().optional().describe('Total amount'),
  currency: z.any().nullable().optional().describe('Currency'),
  expenseLines: z.array(z.any()).nullable().optional().describe('Expense line items'),
  department: z.any().nullable().optional().describe('Department'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  rawData: z.any().optional().describe('Complete raw expense report data')
});

export let searchExpenseReports = SlateTool.create(spec, {
  name: 'Search Expense Reports',
  key: 'search_expense_reports',
  description: `Search and list expense reports in Coupa. Filter by status, submitter, date range, and other attributes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .string()
        .optional()
        .describe(
          'Filter by status (e.g. "draft", "pending_approval", "approved", "rejected")'
        ),
      submittedById: z.number().optional().describe('Filter by submitting user ID'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter reports created after this date (ISO 8601)'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter reports updated after this date (ISO 8601)'),
      exportedFlag: z.boolean().optional().describe('Filter by exported status'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional Coupa query filters'),
      orderBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      expenseReports: z
        .array(expenseReportOutputSchema)
        .describe('List of matching expense reports'),
      count: z.number().describe('Number of expense reports returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let filters: Record<string, string> = {};
    if (ctx.input.filters) {
      for (let [key, value] of Object.entries(ctx.input.filters)) {
        filters[key] = value;
      }
    }
    if (ctx.input.status) filters.status = ctx.input.status;
    if (ctx.input.submittedById) filters['submitted-by[id]'] = String(ctx.input.submittedById);
    if (ctx.input.createdAfter) filters['created-at[gt]'] = ctx.input.createdAfter;
    if (ctx.input.updatedAfter) filters['updated-at[gt]'] = ctx.input.updatedAfter;

    let results = await client.listExpenseReports({
      filters,
      orderBy: ctx.input.orderBy,
      dir: ctx.input.sortDirection,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      exportedFlag: ctx.input.exportedFlag
    });

    let expenseReports = (Array.isArray(results) ? results : []).map((er: any) => ({
      expenseReportId: er.id,
      title: er.title ?? null,
      status: er.status ?? null,
      expenseReportNumber: er['expense-report-number'] ?? er.expense_report_number ?? null,
      submittedBy: er['submitted-by'] ?? er.submitted_by ?? null,
      totalAmount: er.total ?? er.total ?? null,
      currency: er.currency ?? null,
      expenseLines: er['expense-lines'] ?? er.expense_lines ?? null,
      department: er.department ?? null,
      createdAt: er['created-at'] ?? er.created_at ?? null,
      updatedAt: er['updated-at'] ?? er.updated_at ?? null,
      rawData: er
    }));

    return {
      output: {
        expenseReports,
        count: expenseReports.length
      },
      message: `Found **${expenseReports.length}** expense report(s).`
    };
  })
  .build();

export let createExpenseReport = SlateTool.create(spec, {
  name: 'Create Expense Report',
  key: 'create_expense_report',
  description: `Create a new expense report in Coupa with expense line items.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Expense report title'),
      submittedById: z.number().optional().describe('ID of the submitting user'),
      currency: z.object({ code: z.string() }).optional().describe('Currency'),
      department: z.object({ name: z.string() }).optional().describe('Department'),
      expenseLines: z
        .array(
          z.object({
            description: z.string().describe('Expense description'),
            amount: z.number().describe('Expense amount'),
            expenseDate: z.string().describe('Date of expense (ISO 8601)'),
            expenseCategory: z
              .object({ name: z.string() })
              .optional()
              .describe('Expense category'),
            merchant: z.string().optional().describe('Merchant name'),
            account: z.any().optional().describe('Account for this line')
          })
        )
        .min(1)
        .describe('Expense line items'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(expenseReportOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let payload: any = {
      title: ctx.input.title,
      'expense-lines': ctx.input.expenseLines.map(line => {
        let el: any = {
          description: line.description,
          amount: String(line.amount),
          'expense-date': line.expenseDate
        };
        if (line.expenseCategory) el['expense-category'] = line.expenseCategory;
        if (line.merchant) el.merchant = line.merchant;
        if (line.account) el.account = line.account;
        return el;
      })
    };

    if (ctx.input.submittedById) payload['submitted-by'] = { id: ctx.input.submittedById };
    if (ctx.input.currency) payload.currency = ctx.input.currency;
    if (ctx.input.department) payload.department = ctx.input.department;

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        payload[key] = value;
      }
    }

    let result = await client.createExpenseReport(payload);

    return {
      output: {
        expenseReportId: result.id,
        title: result.title ?? null,
        status: result.status ?? null,
        expenseReportNumber:
          result['expense-report-number'] ?? result.expense_report_number ?? null,
        submittedBy: result['submitted-by'] ?? result.submitted_by ?? null,
        totalAmount: result.total ?? result.total ?? null,
        currency: result.currency ?? null,
        expenseLines: result['expense-lines'] ?? result.expense_lines ?? null,
        department: result.department ?? null,
        createdAt: result['created-at'] ?? result.created_at ?? null,
        updatedAt: result['updated-at'] ?? result.updated_at ?? null,
        rawData: result
      },
      message: `Created expense report **"${result.title ?? result.id}"** (status: ${result.status}).`
    };
  })
  .build();
