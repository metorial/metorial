import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { spec } from '../spec';

let filterSchema = z.object({
  field: z
    .string()
    .describe(
      'Field to filter by (e.g. status, state, customer_email, created_at, grand_total, increment_id)'
    ),
  value: z.string().describe('Value to compare against'),
  conditionType: z
    .string()
    .optional()
    .describe('Comparison: eq, neq, gt, gteq, lt, lteq, like, in, nin (default: eq)')
});

export let searchOrders = SlateTool.create(spec, {
  name: 'Search Orders',
  key: 'search_orders',
  description: `Search and filter orders using flexible criteria. Find orders by status, customer email, date range, total amount, or any order field. Supports sorting and pagination for large result sets.`,
  instructions: [
    'Filter by **status** to find orders in a specific state (e.g. pending, processing, complete, closed, canceled).',
    'Use **created_at** with `gt`/`lt` condition types for date range queries.',
    'Use **customer_email** with `eq` to find all orders for a specific customer.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filters: z.array(filterSchema).optional().describe('Search filters'),
      sortField: z
        .string()
        .optional()
        .describe('Field to sort by (e.g. created_at, grand_total, entity_id)'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      pageSize: z.number().optional().describe('Number of results per page (default: 20)'),
      currentPage: z.number().optional().describe('Page number (1-based)')
    })
  )
  .output(
    z.object({
      orders: z
        .array(
          z.object({
            orderId: z.number().optional().describe('Order entity ID'),
            incrementId: z.string().optional().describe('Human-readable order number'),
            state: z.string().optional().describe('Order state'),
            status: z.string().optional().describe('Order status'),
            grandTotal: z.number().optional().describe('Grand total'),
            customerEmail: z.string().optional().describe('Customer email'),
            customerFirstname: z.string().optional().describe('Customer first name'),
            customerLastname: z.string().optional().describe('Customer last name'),
            totalQtyOrdered: z.number().optional().describe('Total items ordered'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of matching orders'),
      totalCount: z.number().describe('Total number of matching orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagentoClient({
      storeUrl: ctx.config.storeUrl,
      storeCode: ctx.config.storeCode,
      token: ctx.auth.token
    });

    let result = await client.searchOrders({
      filters: ctx.input.filters,
      sortField: ctx.input.sortField || 'created_at',
      sortDirection: ctx.input.sortDirection || 'DESC',
      pageSize: ctx.input.pageSize || 20,
      currentPage: ctx.input.currentPage
    });

    return {
      output: {
        orders: result.items.map(o => ({
          orderId: o.entity_id,
          incrementId: o.increment_id,
          state: o.state,
          status: o.status,
          grandTotal: o.grand_total,
          customerEmail: o.customer_email,
          customerFirstname: o.customer_firstname,
          customerLastname: o.customer_lastname,
          totalQtyOrdered: o.total_qty_ordered,
          createdAt: o.created_at,
          updatedAt: o.updated_at
        })),
        totalCount: result.total_count
      },
      message: `Found **${result.total_count}** orders (showing ${result.items.length}).`
    };
  })
  .build();
