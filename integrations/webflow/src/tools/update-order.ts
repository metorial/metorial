import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description: `Update an ecommerce order's status or details. Use this to fulfill orders, add comments, or update shipping information.`
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site'),
      orderId: z.string().describe('Unique identifier of the order to update'),
      comment: z.string().optional().describe('Internal comment to add to the order'),
      status: z
        .enum(['pending', 'fulfilled', 'refunded', 'disputed', 'unfulfilled'])
        .optional()
        .describe('New order status'),
      shippingProvider: z.string().optional().describe('Shipping carrier name'),
      shippingTracking: z.string().optional().describe('Shipping tracking number'),
      shippingTrackingUrl: z.string().optional().describe('Shipping tracking URL')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('ID of the updated order'),
      status: z.string().optional().describe('Current order status'),
      comment: z.string().optional().describe('Order comment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let { siteId, orderId, ...updateData } = ctx.input;

    let body: any = {};
    if (updateData.comment !== undefined) body.comment = updateData.comment;
    if (updateData.status) body.status = updateData.status;
    if (
      updateData.shippingProvider ||
      updateData.shippingTracking ||
      updateData.shippingTrackingUrl
    ) {
      body.shippingProvider = updateData.shippingProvider;
      body.shippingTracking = updateData.shippingTracking;
      body.shippingTrackingUrl = updateData.shippingTrackingUrl;
    }

    let order = await client.updateOrder(siteId, orderId, body);

    return {
      output: {
        orderId: order.orderId ?? order.id ?? orderId,
        status: order.status,
        comment: order.comment
      },
      message: `Updated order **${orderId}**${updateData.status ? ` to status "${updateData.status}"` : ''}.`
    };
  })
  .build();
