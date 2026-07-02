import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let orderSummarySchema = z.object({
  orderId: z.number(),
  status: z.string(),
  currency: z.string(),
  total: z.string(),
  totalTax: z.string(),
  customerId: z.number(),
  billingEmail: z.string(),
  billingFirstName: z.string(),
  billingLastName: z.string(),
  paymentMethod: z.string(),
  paymentMethodTitle: z.string(),
  lineItemCount: z.number(),
  dateCreated: z.string(),
  dateModified: z.string()
});

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Search and list orders from the store. Filter by status, customer, product, date range, and more. Supports pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number'),
      perPage: z.number().optional().default(10).describe('Results per page, max 100'),
      search: z.string().optional().describe('Search orders'),
      status: z
        .enum([
          'any',
          'pending',
          'processing',
          'on-hold',
          'completed',
          'cancelled',
          'refunded',
          'failed',
          'trash'
        ])
        .optional()
        .describe('Filter by order status'),
      customerId: z.number().optional().describe('Filter by customer ID'),
      product: z.number().optional().describe('Filter by product ID'),
      after: z.string().optional().describe('Show orders after this date (ISO 8601)'),
      before: z.string().optional().describe('Show orders before this date (ISO 8601)'),
      orderby: z.enum(['date', 'id', 'title', 'slug']).optional().describe('Sort by field'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      orders: z.array(orderSummarySchema),
      page: z.number(),
      perPage: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let params: Record<string, any> = {
      page: ctx.input.page,
      per_page: ctx.input.perPage
    };

    if (ctx.input.search) params.search = ctx.input.search;
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.customerId) params.customer = ctx.input.customerId;
    if (ctx.input.product) params.product = ctx.input.product;
    if (ctx.input.after) params.after = ctx.input.after;
    if (ctx.input.before) params.before = ctx.input.before;
    if (ctx.input.orderby) params.orderby = ctx.input.orderby;
    if (ctx.input.order) params.order = ctx.input.order;

    let orders = await client.listOrders(params);

    let mapped = orders.map((o: any) => ({
      orderId: o.id,
      status: o.status,
      currency: o.currency || '',
      total: o.total || '0',
      totalTax: o.total_tax || '0',
      customerId: o.customer_id || 0,
      billingEmail: o.billing?.email || '',
      billingFirstName: o.billing?.first_name || '',
      billingLastName: o.billing?.last_name || '',
      paymentMethod: o.payment_method || '',
      paymentMethodTitle: o.payment_method_title || '',
      lineItemCount: (o.line_items || []).length,
      dateCreated: o.date_created || '',
      dateModified: o.date_modified || ''
    }));

    return {
      output: {
        orders: mapped,
        page: ctx.input.page || 1,
        perPage: ctx.input.perPage || 10
      },
      message: `Found **${mapped.length}** orders (page ${ctx.input.page || 1}).`
    };
  })
  .build();
