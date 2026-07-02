import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve detailed information for a specific order by its ID. Returns full order details including customer info, line items, fulfillment status, shipping/billing addresses, and financial totals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('The unique identifier of the order to retrieve')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Unique order identifier'),
      orderNumber: z.string().optional().describe('Human-readable order number'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      modifiedOn: z.string().optional().describe('ISO 8601 last modification timestamp'),
      fulfillmentStatus: z.string().optional().describe('Current fulfillment status'),
      customerEmail: z.string().optional().describe('Customer email address'),
      lineItems: z.array(z.any()).optional().describe('Items in the order'),
      grandTotal: z.any().optional().describe('Total order amount'),
      shippingAddress: z.any().optional().describe('Shipping address'),
      billingAddress: z.any().optional().describe('Billing address'),
      fulfillments: z.array(z.any()).optional().describe('Fulfillment/shipment records'),
      raw: z.any().describe('Complete raw order data from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let order = await client.getOrder(ctx.input.orderId);

    return {
      output: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdOn: order.createdOn,
        modifiedOn: order.modifiedOn,
        fulfillmentStatus: order.fulfillmentStatus,
        customerEmail: order.customerEmail,
        lineItems: order.lineItems,
        grandTotal: order.grandTotal,
        shippingAddress: order.shippingAddress,
        billingAddress: order.billingAddress,
        fulfillments: order.fulfillments,
        raw: order
      },
      message: `Retrieved order **#${order.orderNumber || order.id}** — status: **${order.fulfillmentStatus || 'unknown'}**`
    };
  })
  .build();
