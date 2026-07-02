import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrders = SlateTool.create(spec, {
  name: 'Get Orders',
  key: 'get_orders',
  description: `Retrieve one or more orders by their order number or system ID. Returns the full order data including location, scheduling parameters, custom fields, and notification settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orders: z
        .array(
          z.object({
            orderNo: z.string().optional().describe('Order number'),
            orderId: z.string().optional().describe('System-assigned order ID')
          })
        )
        .describe('Orders to retrieve (specify orderNo or orderId for each)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      orders: z.array(
        z.object({
          success: z.boolean(),
          orderId: z.string().optional(),
          orderNo: z.string().optional(),
          orderData: z.record(z.string(), z.unknown()).optional().describe('Full order data'),
          code: z.string().optional(),
          message: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let requestOrders = ctx.input.orders.map(o => {
      let req: Record<string, unknown> = {};
      if (o.orderNo) req.orderNo = o.orderNo;
      if (o.orderId) req.id = o.orderId;
      return req;
    });

    let result = await client.getOrders(requestOrders);

    let orders = (result.orders || []).map((o: Record<string, unknown>) => ({
      success: o.success as boolean,
      orderId: o.id as string | undefined,
      orderNo: (o.data as Record<string, unknown> | undefined)?.orderNo as string | undefined,
      orderData: o.data as Record<string, unknown> | undefined,
      code: o.code as string | undefined,
      message: o.message as string | undefined
    }));

    let found = orders.filter((o: { success: boolean }) => o.success).length;

    return {
      output: {
        success: result.success,
        orders
      },
      message: `Retrieved **${found}** of **${orders.length}** requested orders.`
    };
  })
  .build();
