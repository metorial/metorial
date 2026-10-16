import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrders = SlateTool.create(spec, {
  key: 'list_orders',
  name: 'List Orders',
  description:
    'Find orders by creation date, purchaser email, or source. Returns order IDs and full details for get_order and update_order, with pagination state.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      createdOnOrAfter: z
        .string()
        .optional()
        .describe('Include orders created at or after this date (UTC)'),
      purchaserEmail: z.string().optional().describe('Filter by purchaser email'),
      source: z
        .enum(['API', 'Checkout', 'Dashboard', 'Import', 'Square', 'Vend', 'External'])
        .optional()
        .describe('Filter by the source of the order'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10)
        .describe('Results per page (1 to 100)'),
      offset: z.number().int().min(0).default(0).describe('Number of orders to skip')
    })
  )
  .output(
    z
      .object({
        orders: z.array(
          z
            .object({
              id: z.string().describe('Order ID'),
              orderId: z.string().describe('Order ID for get_order and update_order'),
              orderNumber: z.string().describe('Human-readable order number')
            })
            .passthrough()
        ),
        total: z.number(),
        hasMore: z.boolean()
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let result = await new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    }).listOrders(ctx.input);
    let orders = result.orders.map((order: { id: string }) => ({
      ...order,
      orderId: order.id
    }));
    return {
      output: { ...result, orders },
      message: `Found ${result.total} orders (showing ${orders.length})${result.hasMore ? '; more results available' : ''}.`
    };
  })
  .build();
