import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description: `Update an ecommerce order's editable details, or transition it through Webflow's supported fulfill, unfulfill, and refund endpoints.`
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site'),
      orderId: z.string().describe('Unique identifier of the order to update'),
      comment: z.string().optional().describe('Internal comment to add to the order'),
      status: z
        .enum(['pending', 'fulfilled', 'refunded', 'disputed', 'unfulfilled'])
        .optional()
        .describe(
          'Supported transitions are fulfilled, unfulfilled, and refunded. pending and disputed are not settable through the Webflow API.'
        ),
      sendOrderFulfilledEmail: z
        .boolean()
        .optional()
        .describe(
          'Whether to send the Webflow order fulfilled email when status is fulfilled'
        ),
      refundReason: z
        .enum(['duplicate', 'fraudulent', 'requested'])
        .optional()
        .describe('Refund reason when status is refunded'),
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
    if (
      updateData.shippingProvider ||
      updateData.shippingTracking ||
      updateData.shippingTrackingUrl
    ) {
      body.shippingProvider = updateData.shippingProvider;
      body.shippingTracking = updateData.shippingTracking;
      body.shippingTrackingURL = updateData.shippingTrackingUrl;
    }

    let order: any;
    if (Object.keys(body).length > 0) {
      order = await client.updateOrder(siteId, orderId, body);
    }

    if (updateData.status) {
      if (updateData.status === 'fulfilled') {
        order = await client.fulfillOrder(siteId, orderId, {
          sendOrderFulfilledEmail: updateData.sendOrderFulfilledEmail
        });
      } else if (updateData.status === 'unfulfilled') {
        order = await client.unfulfillOrder(siteId, orderId);
      } else if (updateData.status === 'refunded') {
        order = await client.refundOrder(siteId, orderId, {
          reason: updateData.refundReason
        });
      } else {
        throw createApiServiceError(
          `Webflow does not expose an API transition to "${updateData.status}". Supported status transitions are fulfilled, unfulfilled, and refunded.`
        );
      }
    }

    if (!order) {
      throw createApiServiceError(
        'Provide at least one order field or supported status transition.'
      );
    }

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
