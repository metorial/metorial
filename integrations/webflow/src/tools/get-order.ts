import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve one Webflow ecommerce order by ID, including customer, status, shipping, payment, and purchased item details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site'),
      orderId: z.string().describe('Unique identifier of the ecommerce order')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Unique identifier for the order'),
      status: z.string().optional().describe('Order status'),
      comment: z.string().optional().describe('Internal comment on the order'),
      customerEmail: z.string().optional().describe('Customer email address'),
      customerName: z.string().optional().describe('Customer full name'),
      totalPrice: z.any().optional().describe('Total order price'),
      totalTax: z.any().optional().describe('Total tax amount'),
      acceptedOn: z.string().optional().describe('ISO 8601 timestamp when order was accepted'),
      fulfilledOn: z.string().optional().describe('ISO 8601 fulfillment timestamp'),
      disputedOn: z.string().optional().describe('ISO 8601 dispute timestamp'),
      refundedOn: z.string().optional().describe('ISO 8601 refund timestamp'),
      purchasedItems: z.array(z.any()).optional().describe('Items in the order'),
      shippingAddress: z.any().optional().describe('Shipping address'),
      billingAddress: z.any().optional().describe('Billing address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let order = await client.getOrder(ctx.input.siteId, ctx.input.orderId);

    return {
      output: {
        orderId: order.orderId ?? order.id ?? ctx.input.orderId,
        status: order.status,
        comment: order.comment,
        customerEmail: order.customerInfo?.email ?? order.customerEmail,
        customerName: order.customerInfo?.fullName ?? order.customerName,
        totalPrice: order.totalPrice,
        totalTax: order.totalTax,
        acceptedOn: order.acceptedOn,
        fulfilledOn: order.fulfilledOn,
        disputedOn: order.disputedOn,
        refundedOn: order.refundedOn,
        purchasedItems: order.purchasedItems,
        shippingAddress: order.shippingAddress,
        billingAddress: order.billingAddress
      },
      message: `Retrieved order **${order.orderId ?? ctx.input.orderId}**.`
    };
  })
  .build();
