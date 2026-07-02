import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listSalesOrders = SlateTool.create(spec, {
  name: 'List Sales Orders',
  key: 'list_sales_orders',
  description: `List sales orders with optional filtering by customer, status, search text, and pagination. Returns order summaries including status and totals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Number of orders per page (max 200)'),
      customerId: z.string().optional().describe('Filter by customer ID'),
      searchText: z.string().optional().describe('Search by order number or reference'),
      filterBy: z
        .enum([
          'Status.All',
          'Status.Draft',
          'Status.Open',
          'Status.Confirmed',
          'Status.Closed',
          'Status.Void',
          'Status.OverDue'
        ])
        .optional()
        .describe('Filter by order status'),
      sortColumn: z
        .enum(['salesorder_number', 'customer_name', 'date', 'total', 'created_time'])
        .optional(),
      sortOrder: z.enum(['ascending', 'descending']).optional()
    })
  )
  .output(
    z.object({
      salesOrders: z.array(
        z.object({
          salesOrderId: z.string().describe('Sales order ID'),
          salesorderNumber: z.string().optional().describe('Order number'),
          customerName: z.string().optional().describe('Customer name'),
          status: z.string().optional().describe('Order status'),
          total: z.number().optional().describe('Total amount'),
          date: z.string().optional().describe('Order date')
        })
      ),
      hasMorePages: z.boolean().describe('Whether more pages exist'),
      totalCount: z.number().optional().describe('Total number of sales orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listSalesOrders({
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      customer_id: ctx.input.customerId,
      search_text: ctx.input.searchText,
      filter_by: ctx.input.filterBy,
      sort_column: ctx.input.sortColumn,
      sort_order: ctx.input.sortOrder
    });

    let salesOrders = (result.salesorders || []).map((so: any) => ({
      salesOrderId: String(so.salesorder_id),
      salesorderNumber: so.salesorder_number ?? undefined,
      customerName: so.customer_name ?? undefined,
      status: so.status ?? undefined,
      total: so.total ?? undefined,
      date: so.date ?? undefined
    }));

    let pageContext = result.page_context || {};

    return {
      output: {
        salesOrders,
        hasMorePages: pageContext.has_more_page ?? false,
        totalCount: pageContext.total ?? undefined
      },
      message: `Found **${salesOrders.length}** sales orders${pageContext.total ? ` (${pageContext.total} total)` : ''}.`
    };
  })
  .build();
