import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/connect-client';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve details for a specific order or list all orders for a Connect user. Includes order status, fulfillment details, item information, and delivery tracking.

Requires **Connect OAuth** authentication with the \`connect:fulfillment\` scope.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('Connect user ID'),
      orderId: z
        .string()
        .optional()
        .describe(
          'Specific order ID to retrieve. If omitted, returns all orders for the user.'
        )
    })
  )
  .output(
    z.object({
      orders: z
        .array(
          z.object({
            orderId: z.string().describe('Order ID'),
            status: z.string().describe('Current order status'),
            orderUrl: z.string().optional().describe('URL to view the order'),
            createdAt: z.string().optional().describe('Order creation timestamp'),
            cancellationReason: z
              .string()
              .optional()
              .describe('Reason for cancellation, if applicable'),
            locale: z.string().optional().describe('Order locale'),
            isInstacartplus: z
              .boolean()
              .optional()
              .describe('Whether Instacart+ benefits were applied'),
            fulfillmentDetails: z
              .object({
                storeLocation: z.string().optional().describe('Store location'),
                windowStartsAt: z.string().optional().describe('Fulfillment window start'),
                windowEndsAt: z.string().optional().describe('Fulfillment window end'),
                deliveredAt: z.string().optional().describe('Actual delivery timestamp'),
                bagCount: z.number().optional().describe('Number of bags')
              })
              .optional()
              .describe('Fulfillment details'),
            items: z
              .array(
                z.object({
                  lineNum: z.string().describe('Item line number'),
                  qty: z.number().optional().describe('Quantity fulfilled'),
                  replaced: z.boolean().optional().describe('Whether the item was replaced'),
                  refunded: z.boolean().optional().describe('Whether the item was refunded'),
                  scanCode: z.string().optional().describe('Scanned product code')
                })
              )
              .optional()
              .describe('Order items')
          })
        )
        .describe('Order(s) matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let orders: any;
    if (ctx.input.orderId) {
      let order = await client.getOrder(ctx.input.userId, ctx.input.orderId);
      orders = [order];
    } else {
      orders = await client.getOrders(ctx.input.userId);
    }

    return {
      output: { orders },
      message: ctx.input.orderId
        ? `Order **${orders[0]?.orderId}** — Status: **${orders[0]?.status}**${orders[0]?.fulfillmentDetails?.windowStartsAt ? ` — Window: ${orders[0].fulfillmentDetails.windowStartsAt} to ${orders[0].fulfillmentDetails.windowEndsAt}` : ''}`
        : `Found **${orders.length}** order(s) for user **${ctx.input.userId}**.`
    };
  })
  .build();
