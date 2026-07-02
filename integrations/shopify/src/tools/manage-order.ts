import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { shopifyServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageOrder = SlateTool.create(spec, {
  name: 'Manage Order',
  key: 'manage_order',
  description: `Perform lifecycle actions on an order. Supports:
- **close**: Close an order
- **open**: Reopen a closed order
- **cancel**: Cancel an order with optional reason, email notification, and restocking
- **update**: Update order notes or tags`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orderId: z.string().describe('Shopify order ID'),
      action: z
        .enum(['close', 'open', 'cancel', 'update'])
        .describe('Action to perform on the order'),
      cancelReason: z
        .enum(['customer', 'fraud', 'inventory', 'declined', 'other'])
        .optional()
        .describe('Reason for cancellation (only for cancel action)'),
      sendEmail: z
        .boolean()
        .optional()
        .describe('Whether to notify the customer by email (only for cancel action)'),
      restock: z
        .boolean()
        .optional()
        .describe('Whether to restock inventory (only for cancel action)'),
      note: z.string().optional().describe('Order note (only for update action)'),
      tags: z.string().optional().describe('Comma-separated tags (only for update action)')
    })
  )
  .output(
    z.object({
      orderId: z.string(),
      name: z.string(),
      financialStatus: z.string().nullable(),
      fulfillmentStatus: z.string().nullable(),
      cancelledAt: z.string().nullable(),
      closedAt: z.string().nullable(),
      note: z.string().nullable(),
      tags: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let order: any;

    if (ctx.input.action === 'close') {
      order = await client.closeOrder(ctx.input.orderId);
    } else if (ctx.input.action === 'open') {
      order = await client.openOrder(ctx.input.orderId);
    } else if (ctx.input.action === 'cancel') {
      order = await client.cancelOrder(ctx.input.orderId, {
        reason: ctx.input.cancelReason,
        email: ctx.input.sendEmail,
        restock: ctx.input.restock
      });
    } else if (ctx.input.action === 'update') {
      let updateData: Record<string, any> = {};
      if (ctx.input.note !== undefined) updateData.note = ctx.input.note;
      if (ctx.input.tags !== undefined) updateData.tags = ctx.input.tags;
      order = await client.updateOrder(ctx.input.orderId, updateData);
    } else {
      throw shopifyServiceError(`Unknown action: ${ctx.input.action}`);
    }

    return {
      output: {
        orderId: String(order.id),
        name: order.name,
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        cancelledAt: order.cancelled_at,
        closedAt: order.closed_at,
        note: order.note,
        tags: order.tags || ''
      },
      message: `Order **${order.name}** has been ${ctx.input.action === 'close' ? 'closed' : ctx.input.action === 'open' ? 'reopened' : ctx.input.action === 'cancel' ? 'cancelled' : 'updated'}.`
    };
  })
  .build();
