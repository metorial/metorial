import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdvancedTradeClient } from '../lib/advanced-trade-client';
import { spec } from '../spec';

let orderOutputSchema = z.object({
  orderId: z.string().describe('Order ID'),
  productId: z.string().optional().describe('Trading pair (e.g., BTC-USD)'),
  side: z.string().optional().describe('BUY or SELL'),
  orderType: z.string().optional().describe('Order type (market, limit, stop_limit)'),
  status: z.string().optional().describe('Order status'),
  filledSize: z.string().optional().describe('Filled size'),
  filledValue: z.string().optional().describe('Filled value'),
  averageFilledPrice: z.string().optional().describe('Average fill price'),
  totalFees: z.string().optional().describe('Total fees paid'),
  createdTime: z.string().optional().describe('Order creation time'),
  completionPercentage: z.string().optional().describe('Completion percentage')
});

export let manageOrders = SlateTool.create(spec, {
  name: 'Manage Orders',
  key: 'manage_orders',
  description: `Create, list, get, or cancel trading orders via the Advanced Trade API. Supports market, limit, and stop-limit orders across 550+ markets. Use **action** to specify the operation.`,
  instructions: [
    'For market buy: provide quoteSize (fiat amount) in orderConfiguration.',
    'For market sell: provide baseSize (crypto amount) in orderConfiguration.',
    'For limit orders: provide baseSize, limitPrice, and optionally endTime.',
    'For stop-limit orders: provide baseSize, limitPrice, and stopPrice.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'get', 'cancel']).describe('Operation to perform'),
      orderId: z.string().optional().describe('Order ID (required for get)'),
      orderIds: z
        .array(z.string())
        .optional()
        .describe('Order IDs to cancel (required for cancel)'),
      productId: z
        .string()
        .optional()
        .describe(
          'Trading pair, e.g., "BTC-USD" (required for create, optional filter for list)'
        ),
      side: z.enum(['BUY', 'SELL']).optional().describe('Order side (required for create)'),
      orderType: z
        .enum(['market', 'limit_gtc', 'limit_gtd', 'stop_limit_gtc', 'stop_limit_gtd'])
        .optional()
        .describe('Order type (required for create)'),
      baseSize: z.string().optional().describe('Amount of base currency (crypto) to trade'),
      quoteSize: z
        .string()
        .optional()
        .describe('Amount of quote currency (fiat) to spend — market buy only'),
      limitPrice: z
        .string()
        .optional()
        .describe('Limit price — required for limit and stop-limit orders'),
      stopPrice: z
        .string()
        .optional()
        .describe('Stop/trigger price — required for stop-limit orders'),
      endTime: z.string().optional().describe('Expiration time for GTD orders (ISO 8601)'),
      orderStatus: z
        .array(z.string())
        .optional()
        .describe('Filter by status for list (e.g., ["OPEN", "FILLED"])'),
      limit: z.number().optional().describe('Max results to return (for list)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)')
    })
  )
  .output(
    z.object({
      order: orderOutputSchema.optional().describe('Single order details'),
      orders: z.array(orderOutputSchema).optional().describe('List of orders'),
      successfulOrderIds: z
        .array(z.string())
        .optional()
        .describe('Successfully cancelled order IDs'),
      failedOrderIds: z.array(z.string()).optional().describe('Failed to cancel order IDs'),
      hasNext: z.boolean().optional().describe('Whether more results are available'),
      cursor: z.string().optional().describe('Next page cursor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdvancedTradeClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.productId) throw new Error('productId is required for create');
      if (!ctx.input.side) throw new Error('side is required for create');
      if (!ctx.input.orderType) throw new Error('orderType is required for create');

      let orderConfig: Record<string, any> = {};

      if (ctx.input.orderType === 'market') {
        if (ctx.input.side === 'BUY') {
          orderConfig.market_market_ioc = { quote_size: ctx.input.quoteSize };
        } else {
          orderConfig.market_market_ioc = { base_size: ctx.input.baseSize };
        }
      } else if (ctx.input.orderType === 'limit_gtc') {
        orderConfig.limit_limit_gtc = {
          base_size: ctx.input.baseSize,
          limit_price: ctx.input.limitPrice,
          post_only: false
        };
      } else if (ctx.input.orderType === 'limit_gtd') {
        orderConfig.limit_limit_gtd = {
          base_size: ctx.input.baseSize,
          limit_price: ctx.input.limitPrice,
          end_time: ctx.input.endTime,
          post_only: false
        };
      } else if (ctx.input.orderType === 'stop_limit_gtc') {
        orderConfig.stop_limit_stop_limit_gtc = {
          base_size: ctx.input.baseSize,
          limit_price: ctx.input.limitPrice,
          stop_price: ctx.input.stopPrice
        };
      } else if (ctx.input.orderType === 'stop_limit_gtd') {
        orderConfig.stop_limit_stop_limit_gtd = {
          base_size: ctx.input.baseSize,
          limit_price: ctx.input.limitPrice,
          stop_price: ctx.input.stopPrice,
          end_time: ctx.input.endTime
        };
      }

      let clientOrderId = `slate_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      let result = await client.createOrder({
        clientOrderId,
        productId: ctx.input.productId,
        side: ctx.input.side,
        orderConfiguration: orderConfig
      });

      let order = result.success_response || result;
      return {
        output: {
          order: {
            orderId: order.order_id || order.id,
            productId: ctx.input.productId,
            side: ctx.input.side,
            orderType: ctx.input.orderType,
            status: result.success ? 'PENDING' : 'FAILED'
          }
        },
        message: result.success
          ? `Created ${ctx.input.side} ${ctx.input.orderType} order for **${ctx.input.productId}**`
          : `Order creation failed: ${result.failure_reason || 'unknown error'}`
      };
    }

    if (action === 'get') {
      if (!ctx.input.orderId) throw new Error('orderId is required for get');
      let order = await client.getOrder(ctx.input.orderId);
      return {
        output: {
          order: {
            orderId: order.order_id,
            productId: order.product_id,
            side: order.side,
            orderType: order.order_type,
            status: order.status,
            filledSize: order.filled_size,
            filledValue: order.filled_value,
            averageFilledPrice: order.average_filled_price,
            totalFees: order.total_fees,
            createdTime: order.created_time,
            completionPercentage: order.completion_percentage
          }
        },
        message: `Order **${order.order_id}** — ${order.side} ${order.product_id} — Status: ${order.status}`
      };
    }

    if (action === 'cancel') {
      if (!ctx.input.orderIds || ctx.input.orderIds.length === 0)
        throw new Error('orderIds is required for cancel');
      let result = await client.cancelOrders(ctx.input.orderIds);
      let results = result.results || [];
      let successful = results.filter((r: any) => r.success).map((r: any) => r.order_id);
      let failed = results.filter((r: any) => !r.success).map((r: any) => r.order_id);
      return {
        output: {
          successfulOrderIds: successful,
          failedOrderIds: failed
        },
        message: `Cancelled **${successful.length}** order(s)${failed.length > 0 ? `, **${failed.length}** failed` : ''}`
      };
    }

    // list
    let result = await client.listOrders({
      productId: ctx.input.productId,
      orderStatus: ctx.input.orderStatus,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let orders = result.orders || [];
    return {
      output: {
        orders: orders.map((o: any) => ({
          orderId: o.order_id,
          productId: o.product_id,
          side: o.side,
          orderType: o.order_type,
          status: o.status,
          filledSize: o.filled_size,
          filledValue: o.filled_value,
          averageFilledPrice: o.average_filled_price,
          totalFees: o.total_fees,
          createdTime: o.created_time,
          completionPercentage: o.completion_percentage
        })),
        hasNext: result.has_next,
        cursor: result.cursor
      },
      message: `Found **${orders.length}** order(s)${result.has_next ? ' (more available)' : ''}`
    };
  })
  .build();
