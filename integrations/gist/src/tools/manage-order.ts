import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  productId: z.string().optional().describe('Product ID'),
  variantId: z.string().optional().describe('Product variant ID'),
  name: z.string().optional().describe('Item name'),
  quantity: z.number().optional().describe('Quantity'),
  price: z.number().optional().describe('Unit price')
});

export let manageOrder = SlateTool.create(spec, {
  name: 'Manage E-Commerce Order',
  key: 'manage_order',
  description: `Create or update an e-commerce order in Gist. Orders track financial status, fulfillment, and line items. Status changes automatically update contact lifetime value (LTV) and trigger timeline events.`
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update'])
        .describe('Create a new order or update an existing one'),
      orderId: z.string().optional().describe('Order ID (required for update)'),
      storeId: z.string().optional().describe('Store ID'),
      customerId: z.string().optional().describe('E-commerce customer ID'),
      orderNumber: z.string().optional().describe('External order number'),
      financialStatus: z
        .enum([
          'pending',
          'paid',
          'refunded',
          'cancelled',
          'partially_refunded',
          'partially_paid'
        ])
        .optional()
        .describe('Financial status'),
      fulfillmentStatus: z
        .enum(['fulfilled', 'unfulfilled', 'partial'])
        .optional()
        .describe('Fulfillment status'),
      totalPrice: z.number().optional().describe('Total order price'),
      currency: z.string().optional().describe('Currency code'),
      lineItems: z.array(lineItemSchema).optional().describe('Order line items'),
      trackingNumber: z.string().optional().describe('Shipping tracking number'),
      trackingUrl: z.string().optional().describe('Shipping tracking URL'),
      cancelledAt: z.string().optional().describe('Cancellation timestamp'),
      processedAt: z.string().optional().describe('Processing timestamp')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Order ID'),
      orderNumber: z.string().optional(),
      financialStatus: z.string().optional(),
      fulfillmentStatus: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.storeId) body.store_id = ctx.input.storeId;
    if (ctx.input.customerId) body.customer_id = ctx.input.customerId;
    if (ctx.input.orderNumber) body.order_number = ctx.input.orderNumber;
    if (ctx.input.financialStatus) body.financial_status = ctx.input.financialStatus;
    if (ctx.input.fulfillmentStatus) body.fulfillment_status = ctx.input.fulfillmentStatus;
    if (ctx.input.totalPrice !== undefined) body.total_price = ctx.input.totalPrice;
    if (ctx.input.currency) body.currency = ctx.input.currency;
    if (ctx.input.trackingNumber) body.tracking_number = ctx.input.trackingNumber;
    if (ctx.input.trackingUrl) body.tracking_url = ctx.input.trackingUrl;
    if (ctx.input.cancelledAt) body.cancelled_at = ctx.input.cancelledAt;
    if (ctx.input.processedAt) body.processed_at = ctx.input.processedAt;
    if (ctx.input.lineItems) {
      body.line_items = ctx.input.lineItems.map(li => ({
        product_id: li.productId,
        variant_id: li.variantId,
        name: li.name,
        quantity: li.quantity,
        price: li.price
      }));
    }

    let data: any;
    if (ctx.input.action === 'create') {
      data = await client.createOrder(body);
    } else {
      if (!ctx.input.orderId) throw new Error('orderId is required for update');
      data = await client.updateOrder(ctx.input.orderId, body);
    }

    let order = data.order || data;

    return {
      output: {
        orderId: String(order.id),
        orderNumber: order.order_number,
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status
      },
      message:
        ctx.input.action === 'create'
          ? `Created order **${order.order_number || order.id}**.`
          : `Updated order **${ctx.input.orderId}**.`
    };
  })
  .build();
