import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

let orderSchema = z.object({
  orderId: z.string().describe('Unique identifier for the order'),
  status: z.string().optional().describe('Order status (e.g., pending, fulfilled, refunded)'),
  comment: z.string().optional().describe('Internal comment on the order'),
  customerEmail: z.string().optional().describe('Customer email address'),
  customerName: z.string().optional().describe('Customer full name'),
  totalPrice: z.any().optional().describe('Total order price'),
  totalTax: z.any().optional().describe('Total tax amount'),
  acceptedOn: z.string().optional().describe('ISO 8601 timestamp when order was accepted'),
  fulfilledOn: z.string().optional().describe('ISO 8601 timestamp when order was fulfilled'),
  disputedOn: z.string().optional().describe('ISO 8601 timestamp when order was disputed'),
  refundedOn: z.string().optional().describe('ISO 8601 timestamp when order was refunded'),
  purchasedItems: z.array(z.any()).optional().describe('Items in the order'),
  shippingAddress: z.any().optional().describe('Shipping address'),
  billingAddress: z.any().optional().describe('Billing address')
});

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `List ecommerce orders for a Webflow site. Optionally filter by order status. Returns order details including customer info, items, and shipping.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site'),
      status: z
        .enum(['pending', 'fulfilled', 'refunded', 'disputed', 'unfulfilled'])
        .optional()
        .describe('Filter orders by status'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of orders to return')
    })
  )
  .output(
    z.object({
      orders: z.array(orderSchema).describe('List of orders'),
      pagination: z
        .object({
          offset: z.number().optional(),
          limit: z.number().optional(),
          total: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let data = await client.listOrders(ctx.input.siteId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      status: ctx.input.status
    });

    let orders = (data.orders ?? []).map((o: any) => ({
      orderId: o.orderId ?? o.id,
      status: o.status,
      comment: o.comment,
      customerEmail: o.customerInfo?.email ?? o.customerEmail,
      customerName: o.customerInfo?.fullName ?? o.customerName,
      totalPrice: o.totalPrice,
      totalTax: o.totalTax,
      acceptedOn: o.acceptedOn,
      fulfilledOn: o.fulfilledOn,
      disputedOn: o.disputedOn,
      refundedOn: o.refundedOn,
      purchasedItems: o.purchasedItems,
      shippingAddress: o.shippingAddress,
      billingAddress: o.billingAddress
    }));

    return {
      output: { orders, pagination: data.pagination },
      message: `Found **${orders.length}** order(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();
