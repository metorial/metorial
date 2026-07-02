import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildClientConfig, flattenResourceList } from '../lib/helpers';
import { spec } from '../spec';

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Search and list rental orders. Supports filtering by status, customer, date range, and tags. Returns paginated results with order details including rental period, pricing, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z.number().optional().describe('Results per page (default 25)'),
      filterStatus: z
        .enum(['new', 'draft', 'reserved', 'started', 'stopped', 'archived', 'canceled'])
        .optional()
        .describe('Filter by order status'),
      filterCustomerId: z.string().optional().describe('Filter by customer ID'),
      filterStartsAtGte: z
        .string()
        .optional()
        .describe('Filter orders starting on or after this ISO 8601 date'),
      filterStartsAtLte: z
        .string()
        .optional()
        .describe('Filter orders starting on or before this ISO 8601 date'),
      filterStopsAtGte: z
        .string()
        .optional()
        .describe('Filter orders stopping on or after this ISO 8601 date'),
      filterStopsAtLte: z
        .string()
        .optional()
        .describe('Filter orders stopping on or before this ISO 8601 date'),
      filterUpdatedAtGte: z
        .string()
        .optional()
        .describe('Filter orders updated on or after this ISO 8601 date'),
      sort: z
        .string()
        .optional()
        .describe('Sort field (prefix with - for descending, e.g. "-starts_at")')
    })
  )
  .output(
    z.object({
      orders: z.array(z.record(z.string(), z.any())).describe('List of order records'),
      totalCount: z.number().optional().describe('Total number of matching orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(buildClientConfig(ctx));

    let filters: Record<string, string> = {};
    if (ctx.input.filterStatus) filters.status = ctx.input.filterStatus;
    if (ctx.input.filterCustomerId) filters.customer_id = ctx.input.filterCustomerId;
    if (ctx.input.filterStartsAtGte) filters['starts_at[gte]'] = ctx.input.filterStartsAtGte;
    if (ctx.input.filterStartsAtLte) filters['starts_at[lte]'] = ctx.input.filterStartsAtLte;
    if (ctx.input.filterStopsAtGte) filters['stops_at[gte]'] = ctx.input.filterStopsAtGte;
    if (ctx.input.filterStopsAtLte) filters['stops_at[lte]'] = ctx.input.filterStopsAtLte;
    if (ctx.input.filterUpdatedAtGte)
      filters['updated_at[gte]'] = ctx.input.filterUpdatedAtGte;

    let response = await client.listOrders({
      pagination: {
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize
      },
      filters,
      sort: ctx.input.sort,
      include: ['customer']
    });

    let orders = flattenResourceList(response);

    return {
      output: {
        orders,
        totalCount: response?.meta?.total_count
      },
      message: `Found ${orders.length} order(s).`
    };
  })
  .build();
