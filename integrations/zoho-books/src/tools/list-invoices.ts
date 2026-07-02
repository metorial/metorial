import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listInvoicesTool = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Search and list invoices with filtering by status, customer, date range, and more. Returns invoice summaries with amounts and status.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      customerId: z.string().optional().describe('Filter by customer ID'),
      status: z
        .enum([
          'draft',
          'sent',
          'overdue',
          'paid',
          'void',
          'unpaid',
          'partially_paid',
          'viewed'
        ])
        .optional()
        .describe('Filter by invoice status'),
      invoiceNumber: z.string().optional().describe('Search by invoice number'),
      dateFrom: z.string().optional().describe('Filter invoices from this date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Filter invoices up to this date (YYYY-MM-DD)'),
      searchText: z
        .string()
        .optional()
        .describe('Search invoices by invoice number, customer name, or reference number'),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(200),
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
        .optional(),
      sortOrder: z.enum(['ascending', 'descending']).optional()
    })
  )
  .output(
    z.object({
      invoices: z.array(
        z.object({
          invoiceId: z.string(),
          invoiceNumber: z.string().optional(),
          customerName: z.string().optional(),
          customerId: z.string().optional(),
          status: z.string().optional(),
          date: z.string().optional(),
          dueDate: z.string().optional(),
          total: z.number().optional(),
          balance: z.number().optional(),
          currencyCode: z.string().optional(),
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
    let query: Record<string, any> = {
      page: ctx.input.page,
      per_page: ctx.input.perPage
    };

    if (ctx.input.customerId) query.customer_id = ctx.input.customerId;
    if (ctx.input.status) query.status = ctx.input.status;
    if (ctx.input.invoiceNumber) query.invoice_number = ctx.input.invoiceNumber;
    if (ctx.input.dateFrom) query.date_start = ctx.input.dateFrom;
    if (ctx.input.dateTo) query.date_end = ctx.input.dateTo;
    if (ctx.input.searchText) query.search_text = ctx.input.searchText;
    if (ctx.input.sortColumn) query.sort_column = ctx.input.sortColumn;
    if (ctx.input.sortOrder) query.sort_order = ctx.input.sortOrder;

    let resp = await client.listInvoices(query);

    let invoices = (resp.invoices || []).map((inv: any) => ({
      invoiceId: inv.invoice_id,
      invoiceNumber: inv.invoice_number,
      customerName: inv.customer_name,
      customerId: inv.customer_id,
      status: inv.status,
      date: inv.date,
      dueDate: inv.due_date,
      total: inv.total,
      balance: inv.balance,
      currencyCode: inv.currency_code,
      createdTime: inv.created_time
    }));

    let pageContext = resp.page_context
      ? {
          page: resp.page_context.page,
          perPage: resp.page_context.per_page,
          hasMorePage: resp.page_context.has_more_page
        }
      : undefined;

    return {
      output: { invoices, pageContext },
      message: `Found **${invoices.length}** invoice(s) on page ${ctx.input.page}.`
    };
  })
  .build();
