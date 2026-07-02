import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let shipmentItemSchema = z.object({
  orderProductId: z.number().describe('The order product ID to include in the shipment'),
  quantity: z.number().describe('Quantity of this product in the shipment')
});

export let manageOrderShipment = SlateTool.create(spec, {
  name: 'Manage Order Shipment',
  key: 'manage_order_shipment',
  description: `Create or update shipments for an order. Use this to mark items as shipped with tracking information, or to list existing shipments for an order.`,
  instructions: [
    'To create a shipment, provide orderId, trackingNumber, shippingProvider, and items.',
    'To update a shipment, additionally provide shipmentId.',
    'To list shipments, set action to "list" and provide orderId.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'list']).describe('Action to perform'),
      orderId: z.number().describe('The order ID'),
      shipmentId: z.number().optional().describe('The shipment ID (required for update)'),
      trackingNumber: z.string().optional().describe('Tracking number for the shipment'),
      shippingMethod: z.string().optional().describe('Shipping method description'),
      shippingProvider: z
        .string()
        .optional()
        .describe('Shipping provider (e.g., "fedex", "ups", "usps")'),
      trackingCarrier: z.string().optional().describe('Tracking carrier name'),
      items: z
        .array(shipmentItemSchema)
        .optional()
        .describe('Items to include in the shipment'),
      comments: z.string().optional().describe('Shipment comments')
    })
  )
  .output(
    z.object({
      shipment: z.any().optional().describe('The created or updated shipment'),
      shipments: z.array(z.any()).optional().describe('List of shipments (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    if (ctx.input.action === 'list') {
      let shipments = await client.listOrderShipments(ctx.input.orderId);
      return {
        output: { shipments },
        message: `Found ${shipments.length} shipments for order #${ctx.input.orderId}.`
      };
    }

    let shipmentData: Record<string, any> = {};
    if (ctx.input.trackingNumber) shipmentData.tracking_number = ctx.input.trackingNumber;
    if (ctx.input.shippingMethod) shipmentData.shipping_method = ctx.input.shippingMethod;
    if (ctx.input.shippingProvider)
      shipmentData.shipping_provider = ctx.input.shippingProvider;
    if (ctx.input.trackingCarrier) shipmentData.tracking_carrier = ctx.input.trackingCarrier;
    if (ctx.input.comments) shipmentData.comments = ctx.input.comments;
    if (ctx.input.items) {
      shipmentData.items = ctx.input.items.map(item => ({
        order_product_id: item.orderProductId,
        quantity: item.quantity
      }));
    }

    if (ctx.input.action === 'update' && ctx.input.shipmentId) {
      let shipment = await client.updateOrderShipment(
        ctx.input.orderId,
        ctx.input.shipmentId,
        shipmentData
      );
      return {
        output: { shipment },
        message: `Updated shipment #${ctx.input.shipmentId} for order #${ctx.input.orderId}.`
      };
    }

    let shipment = await client.createOrderShipment(ctx.input.orderId, shipmentData);
    return {
      output: { shipment },
      message: `Created shipment for order #${ctx.input.orderId}.`
    };
  })
  .build();
