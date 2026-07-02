import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { spec } from '../spec';

export let createFulfillment = SlateTool.create(spec, {
  name: 'Create Fulfillment',
  key: 'create_fulfillment',
  description: `Create a fulfillment for an order. Specify the fulfillment order line items, tracking information, and whether to notify the customer. Use Get Order to find fulfillment order IDs first.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orderId: z.string().describe('Order ID to view fulfillment orders for'),
      lineItemsByFulfillmentOrder: z
        .array(
          z.object({
            fulfillmentOrderId: z.string().describe('Fulfillment order ID'),
            fulfillmentOrderLineItems: z
              .array(
                z.object({
                  fulfillmentOrderLineItemId: z
                    .string()
                    .describe('Line item ID within the fulfillment order'),
                  quantity: z.number().describe('Quantity to fulfill')
                })
              )
              .optional()
              .describe('Specific line items to fulfill (omit to fulfill all)')
          })
        )
        .describe('Fulfillment order line items to fulfill'),
      trackingNumber: z.string().optional().describe('Tracking number'),
      trackingUrl: z.string().optional().describe('Tracking URL'),
      trackingCompany: z.string().optional().describe('Shipping carrier name'),
      notifyCustomer: z
        .boolean()
        .optional()
        .describe('Whether to send shipment notification email')
    })
  )
  .output(
    z.object({
      fulfillmentId: z.string(),
      orderId: z.string(),
      status: z.string(),
      trackingNumber: z.string().nullable(),
      trackingUrl: z.string().nullable(),
      trackingCompany: z.string().nullable(),
      createdAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let fulfillmentData: Record<string, any> = {
      line_items_by_fulfillment_order: ctx.input.lineItemsByFulfillmentOrder.map(fo => {
        let item: Record<string, any> = {
          fulfillment_order_id: fo.fulfillmentOrderId
        };
        if (fo.fulfillmentOrderLineItems) {
          item.fulfillment_order_line_items = fo.fulfillmentOrderLineItems.map(li => ({
            id: li.fulfillmentOrderLineItemId,
            quantity: li.quantity
          }));
        }
        return item;
      })
    };

    if (ctx.input.trackingNumber || ctx.input.trackingUrl || ctx.input.trackingCompany) {
      fulfillmentData.tracking_info = {};
      if (ctx.input.trackingNumber)
        fulfillmentData.tracking_info.number = ctx.input.trackingNumber;
      if (ctx.input.trackingUrl) fulfillmentData.tracking_info.url = ctx.input.trackingUrl;
      if (ctx.input.trackingCompany)
        fulfillmentData.tracking_info.company = ctx.input.trackingCompany;
    }

    if (ctx.input.notifyCustomer !== undefined) {
      fulfillmentData.notify_customer = ctx.input.notifyCustomer;
    }

    let f = await client.createFulfillment(fulfillmentData);

    return {
      output: {
        fulfillmentId: String(f.id),
        orderId: String(f.order_id),
        status: f.status,
        trackingNumber: f.tracking_number,
        trackingUrl: f.tracking_url,
        trackingCompany: f.tracking_company,
        createdAt: f.created_at
      },
      message: `Created fulfillment **${f.id}** for order ${ctx.input.orderId} with status: ${f.status}.`
    };
  })
  .build();
