import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

let orderSummarySchema = z.object({
  orderId: z.string(),
  orderNumber: z.number(),
  name: z.string().describe('Human-readable order name (e.g., #1001)'),
  email: z.string().nullable(),
  totalPrice: z.string(),
  subtotalPrice: z.string(),
  totalTax: z.string(),
  currency: z.string(),
  financialStatus: z.string().nullable(),
  fulfillmentStatus: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  cancelledAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  customerName: z.string().nullable(),
  lineItemCount: z.number()
});

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Search and list orders from the Shopify store. Filter by status, financial status, fulfillment status, date range, and more. Returns order summaries.`,
  tags: { readOnly: true },
  constraints: [
    'By default, only orders from the last 60 days are accessible. The read_all_orders scope is required to access older orders.'
  ]
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of orders to return (max 250)'),
      status: z
        .enum(['open', 'closed', 'cancelled', 'any'])
        .optional()
        .describe('Filter by order status (defaults to open)'),
      financialStatus: z
        .enum([
          'authorized',
          'pending',
          'paid',
          'partially_paid',
          'refunded',
          'voided',
          'partially_refunded',
          'any',
          'unpaid'
        ])
        .optional()
        .describe('Filter by financial status'),
      fulfillmentStatus: z
        .enum(['shipped', 'partial', 'unshipped', 'any', 'unfulfilled'])
        .optional()
        .describe('Filter by fulfillment status'),
      createdAtMin: z
        .string()
        .optional()
        .describe('Show orders created after this date (ISO 8601)'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Show orders created before this date (ISO 8601)'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Show orders updated after this date (ISO 8601)'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Show orders updated before this date (ISO 8601)'),
      sinceId: z.string().optional().describe('Show orders after this ID for pagination'),
      ids: z.string().optional().describe('Comma-separated list of order IDs to retrieve')
    })
  )
  .output(
    z.object({
      orders: z.array(orderSummarySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let orders = await client.listOrders({
      limit: ctx.input.limit,
      status: ctx.input.status,
      financialStatus: ctx.input.financialStatus,
      fulfillmentStatus: ctx.input.fulfillmentStatus,
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax,
      sinceId: ctx.input.sinceId,
      ids: ctx.input.ids
    });

    let mapped = orders.map((o: any) => ({
      orderId: String(o.id),
      orderNumber: o.order_number,
      name: o.name,
      email: o.email,
      totalPrice: o.total_price,
      subtotalPrice: o.subtotal_price,
      totalTax: o.total_tax,
      currency: o.currency,
      financialStatus: o.financial_status,
      fulfillmentStatus: o.fulfillment_status,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      cancelledAt: o.cancelled_at,
      closedAt: o.closed_at,
      customerName: o.customer
        ? `${o.customer.first_name || ''} ${o.customer.last_name || ''}`.trim()
        : null,
      lineItemCount: (o.line_items || []).length
    }));

    return {
      output: { orders: mapped },
      message: `Found **${mapped.length}** order(s).`
    };
  })
  .build();
