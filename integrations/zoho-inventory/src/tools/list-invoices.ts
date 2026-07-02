import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `List invoices with optional filtering by customer, status, search text, and pagination. Returns invoice summaries including status and balances.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Number of invoices per page (max 200)'),
      customerId: z.string().optional().describe('Filter by customer ID'),
      searchText: z.string().optional().describe('Search by invoice number or reference'),
      filterBy: z
        .enum([
          'Status.All',
          'Status.Draft',
          'Status.Sent',
          'Status.OverDue',
          'Status.Paid',
          'Status.Void',
          'Status.Unpaid',
          'Status.PartiallyPaid'
        ])
        .optional()
        .describe('Filter by invoice status'),
      sortColumn: z
        .enum([
          'invoice_number',
          'customer_name',
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
          invoiceId: z.string().describe('Invoice ID'),
          invoiceNumber: z.string().optional().describe('Invoice number'),
          customerName: z.string().optional().describe('Customer name'),
          status: z.string().optional().describe('Invoice status'),
          total: z.number().optional().describe('Total amount'),
          balanceDue: z.number().optional().describe('Balance due'),
          date: z.string().optional().describe('Invoice date'),
          dueDate: z.string().optional().describe('Due date')
        })
      ),
      hasMorePages: z.boolean().describe('Whether more pages exist'),
      totalCount: z.number().optional().describe('Total number of invoices')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listInvoices({
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      customer_id: ctx.input.customerId,
      search_text: ctx.input.searchText,
      filter_by: ctx.input.filterBy,
      sort_column: ctx.input.sortColumn,
      sort_order: ctx.input.sortOrder
    });

    let invoices = (result.invoices || []).map((inv: any) => ({
      invoiceId: String(inv.invoice_id),
      invoiceNumber: inv.invoice_number ?? undefined,
      customerName: inv.customer_name ?? undefined,
      status: inv.status ?? undefined,
      total: inv.total ?? undefined,
      balanceDue: inv.balance ?? undefined,
      date: inv.date ?? undefined,
      dueDate: inv.due_date ?? undefined
    }));

    let pageContext = result.page_context || {};

    return {
      output: {
        invoices,
        hasMorePages: pageContext.has_more_page ?? false,
        totalCount: pageContext.total ?? undefined
      },
      message: `Found **${invoices.length}** invoices${pageContext.total ? ` (${pageContext.total} total)` : ''}.`
    };
  })
  .build();
