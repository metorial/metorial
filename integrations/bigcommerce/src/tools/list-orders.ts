import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Search and list orders from the store. Supports filtering by status, customer, date range, and more. Returns order details including totals, status, and customer information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      limit: z
        .number()
        .optional()
        .describe('Number of orders per page (max: 250, default: 50)'),
      statusId: z.number().optional().describe('Filter by order status ID'),
      customerId: z.number().optional().describe('Filter by customer ID'),
      minDateCreated: z
        .string()
        .optional()
        .describe('Filter orders created after this date (RFC 2822 format)'),
      maxDateCreated: z
        .string()
        .optional()
        .describe('Filter orders created before this date (RFC 2822 format)'),
      minDateModified: z
        .string()
        .optional()
        .describe('Filter orders modified after this date'),
      maxDateModified: z
        .string()
        .optional()
        .describe('Filter orders modified before this date'),
      minTotal: z.number().optional().describe('Filter by minimum order total'),
      maxTotal: z.number().optional().describe('Filter by maximum order total'),
      isDeleted: z.boolean().optional().describe('Filter by deleted/archived status'),
      sortBy: z
        .enum([
          'id',
          'customer_id',
          'date_created',
          'date_modified',
          'status_id',
          'channel_id'
        ])
        .optional()
        .describe('Sort field'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      orders: z.array(z.any()).describe('Array of order objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    let params: Record<string, any> = {};
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.statusId !== undefined) params.status_id = ctx.input.statusId;
    if (ctx.input.customerId) params.customer_id = ctx.input.customerId;
    if (ctx.input.minDateCreated) params.min_date_created = ctx.input.minDateCreated;
    if (ctx.input.maxDateCreated) params.max_date_created = ctx.input.maxDateCreated;
    if (ctx.input.minDateModified) params.min_date_modified = ctx.input.minDateModified;
    if (ctx.input.maxDateModified) params.max_date_modified = ctx.input.maxDateModified;
    if (ctx.input.minTotal !== undefined) params.min_total = ctx.input.minTotal;
    if (ctx.input.maxTotal !== undefined) params.max_total = ctx.input.maxTotal;
    if (ctx.input.isDeleted !== undefined) params.is_deleted = ctx.input.isDeleted;
    if (ctx.input.sortBy) params.sort = ctx.input.sortBy;
    if (ctx.input.sortDirection) params.direction = ctx.input.sortDirection;

    let orders = await client.listOrders(params);

    return {
      output: {
        orders: orders || []
      },
      message: `Found ${(orders || []).length} orders.`
    };
  })
  .build();
