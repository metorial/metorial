import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteOrders = SlateTool.create(spec, {
  name: 'Delete Orders',
  key: 'delete_orders',
  description: `Delete one or more orders from OptimoRoute. Can delete specific orders by number/ID, or delete all orders for a given date. Use **forceDelete** to remove orders that are part of linked pickup-delivery pairs.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      mode: z
        .enum(['single', 'bulk', 'all'])
        .describe(
          "'single': delete one order, 'bulk': delete multiple, 'all': delete all orders for a date"
        ),
      orderNo: z.string().optional().describe('Order number (for single mode)'),
      orderId: z.string().optional().describe('System-assigned order ID (for single mode)'),
      orders: z
        .array(
          z.object({
            orderNo: z.string().optional(),
            orderId: z.string().optional()
          })
        )
        .optional()
        .describe('Orders to delete (for bulk mode, max 500)'),
      date: z
        .string()
        .optional()
        .describe('Date to delete all orders for (YYYY-MM-DD, for all mode)'),
      forceDelete: z
        .boolean()
        .optional()
        .describe('Force delete linked pickup-delivery orders'),
      deleteMultiple: z
        .boolean()
        .optional()
        .describe('Allow deleting multiple orders with the same orderNo (bulk mode)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      code: z.string().optional(),
      message: z.string().optional(),
      orders: z
        .array(
          z.object({
            success: z.boolean(),
            orderNo: z.string().optional(),
            orderId: z.string().optional(),
            code: z.string().optional()
          })
        )
        .optional()
        .describe('Per-order results (bulk mode only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.mode === 'single') {
      let result = await client.deleteOrder(
        ctx.input.orderNo,
        ctx.input.orderId,
        ctx.input.forceDelete
      );
      return {
        output: {
          success: result.success,
          code: result.code,
          message: result.message
        },
        message: result.success
          ? `Order **${ctx.input.orderNo || ctx.input.orderId}** deleted.`
          : `Failed to delete order: ${result.message || result.code}`
      };
    }

    if (ctx.input.mode === 'all') {
      let result = await client.deleteAllOrders(ctx.input.date);
      return {
        output: {
          success: result.success,
          code: result.code,
          message: result.message
        },
        message: result.success
          ? `All orders${ctx.input.date ? ` for ${ctx.input.date}` : ''} deleted.`
          : `Failed to delete orders: ${result.message || result.code}`
      };
    }

    // bulk mode
    let requestOrders = (ctx.input.orders || []).map(o => {
      let req: Record<string, unknown> = {};
      if (o.orderNo) req.orderNo = o.orderNo;
      if (o.orderId) req.id = o.orderId;
      return req;
    });

    let result = await client.deleteOrders(
      requestOrders,
      ctx.input.forceDelete,
      ctx.input.deleteMultiple
    );

    let orders = (result.orders || []).map((o: Record<string, unknown>) => ({
      success: o.success as boolean,
      orderNo: o.orderNo as string | undefined,
      orderId: o.id as string | undefined,
      code: o.code as string | undefined
    }));

    let successCount = orders.filter((o: { success: boolean }) => o.success).length;

    return {
      output: {
        success: result.success,
        orders
      },
      message: `Deleted **${successCount}** of **${orders.length}** orders.`
    };
  })
  .build();
