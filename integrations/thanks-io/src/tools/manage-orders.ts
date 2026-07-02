import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

export let manageOrders = SlateTool.create(spec, {
  name: 'Manage Orders',
  key: 'manage_orders',
  description: `List recent orders, track delivery status, or cancel an order. Provides order details including type, status, cost, and delivery statistics.
Only orders in "Reviewing" status can be cancelled for a full refund.`,
  instructions: [
    'Set action to "list", "track", or "cancel".',
    'For "track" and "cancel", provide the orderId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'track', 'cancel']).describe('Action to perform'),
      orderId: z.string().optional().describe('Order ID (for track and cancel)'),
      itemsPerPage: z.number().optional().describe('Items per page (for list)'),
      subAccountId: z.number().optional().describe('Filter by sub-account ID (for list)')
    })
  )
  .output(
    z.object({
      orders: z.array(z.record(z.string(), z.unknown())).optional().describe('List of orders'),
      orderId: z.number().optional().describe('Order ID'),
      orderStatus: z.string().optional().describe('Order status'),
      trackingStats: z
        .object({
          delivered: z.number().optional(),
          processing: z.number().optional(),
          printed: z.number().optional(),
          inTransit: z.number().optional(),
          inLocalArea: z.number().optional(),
          processedForDelivery: z.number().optional(),
          reRouted: z.number().optional(),
          returnedToSender: z.number().optional(),
          failed: z.number().optional(),
          scans: z.number().optional()
        })
        .optional()
        .describe('Delivery tracking statistics'),
      cancelled: z.boolean().optional().describe('Whether the order was cancelled'),
      totalCount: z.number().optional().describe('Total number of orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ThanksIoClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listOrders({
        itemsPerPage: ctx.input.itemsPerPage,
        subAccountId: ctx.input.subAccountId
      });
      let data = (result.data || []) as Record<string, unknown>[];
      let meta = result.meta as Record<string, unknown> | undefined;
      return {
        output: {
          orders: data,
          totalCount: meta?.total as number | undefined
        },
        message: `Found **${meta?.total || data.length}** order(s).`
      };
    }

    if (action === 'track') {
      if (!ctx.input.orderId) throw new Error('orderId is required for track action');
      let result = await client.trackOrder(ctx.input.orderId);
      let data = result.data as Record<string, unknown> | undefined;
      let stats = data?.stats as Record<string, unknown> | undefined;
      let order = data?.order as Record<string, unknown> | undefined;
      return {
        output: {
          orderId: order?.id as number | undefined,
          orderStatus: order?.status as string | undefined,
          trackingStats: stats
            ? {
                delivered: stats.delivered as number | undefined,
                processing: stats.processing as number | undefined,
                printed: stats.printed as number | undefined,
                inTransit: stats.in_transit as number | undefined,
                inLocalArea: stats.in_local_area as number | undefined,
                processedForDelivery: stats.processed_for_delivery as number | undefined,
                reRouted: stats.re_routed as number | undefined,
                returnedToSender: stats.returned_to_sender as number | undefined,
                failed: stats.failed as number | undefined,
                scans: stats.scans as number | undefined
              }
            : undefined
        },
        message: `Order **#${ctx.input.orderId}** status: **${order?.status}**. Delivered: **${stats?.delivered || 0}**, In Transit: **${stats?.in_transit || 0}**, Failed: **${stats?.failed || 0}**.`
      };
    }

    if (action === 'cancel') {
      if (!ctx.input.orderId) throw new Error('orderId is required for cancel action');
      let result = await client.cancelOrder(ctx.input.orderId);
      let order = result.order as Record<string, unknown> | undefined;
      return {
        output: {
          orderId: order?.id as number | undefined,
          orderStatus: order?.status as string | undefined,
          cancelled: true
        },
        message: `Order **#${ctx.input.orderId}** has been cancelled. Credits refunded.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
