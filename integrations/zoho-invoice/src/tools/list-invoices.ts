import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Search and list invoices in Zoho Invoice. Supports filtering by status, customer, date range, amounts, and free-text search. Returns paginated invoice summaries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum([
          'sent',
          'draft',
          'overdue',
          'paid',
          'void',
          'unpaid',
          'partially_paid',
          'viewed'
        ])
        .optional()
        .describe('Filter by invoice status'),
      customerName: z.string().optional().describe('Filter by customer name'),
      invoiceNumber: z.string().optional().describe('Search by invoice number'),
      date: z.string().optional().describe('Filter by invoice date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Filter by due date (YYYY-MM-DD)'),
      total: z.number().optional().describe('Filter by total amount'),
      balance: z.number().optional().describe('Filter by outstanding balance'),
      searchText: z.string().optional().describe('Free-text search across invoices'),
      sortColumn: z
        .enum([
          'customer_name',
          'invoice_number',
          'date',
          'due_date',
          'total',
          'balance',
          'created_time'
        ])
        .optional()
        .describe('Column to sort results by'),
      page: z
        .number()
        .optional()
        .default(1)
        .describe('Page number for pagination (starts at 1)'),
      perPage: z
        .number()
        .optional()
        .default(200)
        .describe('Number of invoices per page (max 200)')
    })
  )
  .output(
    z.object({
      invoices: z
        .array(
          z.object({
            invoiceId: z.string().describe('Invoice ID'),
            invoiceNumber: z.string().optional().describe('Invoice number'),
            status: z.string().optional().describe('Invoice status'),
            customerName: z.string().optional().describe('Customer name'),
            customerId: z.string().optional().describe('Customer ID'),
            date: z.string().optional().describe('Invoice date'),
            dueDate: z.string().optional().describe('Due date'),
            total: z.number().optional().describe('Total amount'),
            balance: z.number().optional().describe('Outstanding balance'),
            currencyCode: z.string().optional().describe('Currency code'),
            createdTime: z
              .string()
              .optional()
              .describe('Timestamp when the invoice was created')
          })
        )
        .describe('List of invoices'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page'),
      hasMorePages: z.boolean().describe('Whether more pages of results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let query: Record<string, any> = {
      page: ctx.input.page,
      per_page: ctx.input.perPage
    };

    if (ctx.input.status) query.status = ctx.input.status;
    if (ctx.input.customerName) query.customer_name = ctx.input.customerName;
    if (ctx.input.invoiceNumber) query.invoice_number = ctx.input.invoiceNumber;
    if (ctx.input.date) query.date = ctx.input.date;
    if (ctx.input.dueDate) query.due_date = ctx.input.dueDate;
    if (ctx.input.total !== undefined) query.total = ctx.input.total;
    if (ctx.input.balance !== undefined) query.balance = ctx.input.balance;
    if (ctx.input.searchText) query.search_text = ctx.input.searchText;
    if (ctx.input.sortColumn) query.sort_column = ctx.input.sortColumn;

    let result = await client.listInvoices(query);

    let invoices = (result.invoices || []).map((inv: any) => ({
      invoiceId: inv.invoice_id,
      invoiceNumber: inv.invoice_number,
      status: inv.status,
      customerName: inv.customer_name,
      customerId: inv.customer_id,
      date: inv.date,
      dueDate: inv.due_date,
      total: inv.total,
      balance: inv.balance,
      currencyCode: inv.currency_code,
      createdTime: inv.created_time
    }));

    let pageContext = result.pageContext;
    let hasMorePages = pageContext?.has_more_page ?? false;

    return {
      output: {
        invoices,
        page: pageContext?.page ?? ctx.input.page ?? 1,
        perPage: pageContext?.per_page ?? ctx.input.perPage ?? 200,
        hasMorePages
      },
      message: `Found **${invoices.length}** invoice(s) on page ${ctx.input.page ?? 1}.${hasMorePages ? ' More pages available.' : ''}`
    };
  })
  .build();
