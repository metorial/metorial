import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrintMailClient } from '../lib/client';
import { spec } from '../spec';

export let listOrders = SlateTool.create(spec, {
  name: 'List Mail Orders',
  key: 'list_orders',
  description:
    'List and search mail orders of one type. Returns IDs and status for tracking with get_order or cancellation with cancel_order.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      orderType: z
        .enum(['letter', 'postcard', 'cheque', 'self_mailer'])
        .describe('Type of mail orders to list'),
      search: z.string().optional().describe('Text or structured JSON search query'),
      skip: z
        .number()
        .optional()
        .describe('Number of records to skip; a non-negative whole number'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of records; a positive whole number (default 10)')
    })
  )
  .output(
    z.object({
      orders: z.array(
        z.object({
          orderId: z.string(),
          orderType: z.string(),
          status: z.string(),
          description: z.string().optional().nullable(),
          live: z.boolean().optional().nullable(),
          sendDate: z.string().optional().nullable(),
          trackingNumber: z.string().optional().nullable(),
          createdAt: z.string().optional().nullable(),
          updatedAt: z.string().optional().nullable()
        })
      ),
      totalCount: z.number(),
      skip: z.number(),
      limit: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrintMailClient(ctx.auth.token);
    let { orderType, ...params } = ctx.input;
    let result = await client.listOrders(orderType, params);
    let orders = (result.data ?? []).map((order: any) => ({
      orderId: order.id,
      orderType,
      status: order.status,
      description: order.description,
      live: order.live,
      sendDate: order.sendDate,
      trackingNumber: order.trackingNumber,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));
    return {
      output: {
        orders,
        totalCount: result.totalCount ?? 0,
        skip: result.skip ?? params.skip ?? 0,
        limit: result.limit ?? params.limit ?? 10
      },
      message: `Found **${result.totalCount ?? 0}** ${orderType} orders, returning ${orders.length}.`
    };
  })
  .build();
