import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdvancedTradeClient } from '../lib/advanced-trade-client';
import { coinbaseOAuthAuthMethods } from '../lib/auth-methods';
import { coinbaseServiceError } from '../lib/errors';
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

let previewOutputSchema = z.object({
  previewId: z.string().optional().describe('Preview ID returned by Coinbase'),
  orderTotal: z.string().optional().describe('Estimated total order value'),
  commissionTotal: z.string().optional().describe('Estimated total commission'),
  quoteSize: z.string().optional().describe('Quote size'),
  baseSize: z.string().optional().describe('Base size'),
  bestBid: z.string().optional().describe('Best bid at preview time'),
  bestAsk: z.string().optional().describe('Best ask at preview time'),
  estimatedAverageFilledPrice: z
    .string()
    .optional()
    .describe('Estimated average filled price'),
  slippage: z.string().optional().describe('Estimated slippage'),
  errors: z.array(z.string()).optional().describe('Preview errors returned by Coinbase'),
  warnings: z.array(z.string()).optional().describe('Preview warnings returned by Coinbase')
});

let manageOrdersInputSchema = z.object({
  action: z
    .enum(['preview', 'create', 'list', 'get', 'cancel'])
    .describe('Operation to perform'),
  orderId: z.string().optional().describe('Order ID (required for get)'),
  orderIds: z
    .array(z.string())
    .optional()
    .describe('Order IDs to cancel (required for cancel)'),
  productId: z
    .string()
    .optional()
    .describe(
      'Trading pair, e.g., "BTC-USD" (required for preview/create, optional filter for list)'
    ),
  side: z
    .enum(['BUY', 'SELL'])
    .optional()
    .describe('Order side (required for preview/create)'),
  orderType: z
    .enum(['market', 'limit_gtc', 'limit_gtd', 'stop_limit_gtc', 'stop_limit_gtd'])
    .optional()
    .describe('Order type (required for preview/create)'),
  baseSize: z.string().optional().describe('Amount of base currency (crypto) to trade'),
  quoteSize: z
    .string()
    .optional()
    .describe('Amount of quote currency (fiat) to spend; required for market buys'),
  limitPrice: z
    .string()
    .optional()
    .describe('Limit price; required for limit and stop-limit orders'),
  stopPrice: z.string().optional().describe('Stop trigger price for stop-limit orders'),
  stopDirection: z
    .enum(['STOP_DIRECTION_STOP_UP', 'STOP_DIRECTION_STOP_DOWN'])
    .optional()
    .describe('Stop direction for stop-limit orders'),
  endTime: z.string().optional().describe('Expiration time for GTD orders (ISO 8601)'),
  postOnly: z.boolean().optional().describe('Whether limit orders should be post-only'),
  orderStatus: z
    .array(z.string())
    .optional()
    .describe('Filter by status for list (e.g., ["OPEN", "FILLED"])'),
  limit: z.number().optional().describe('Max results to return (for list)'),
  cursor: z.string().optional().describe('Pagination cursor (for list)')
});

type ManageOrdersInput = z.infer<typeof manageOrdersInputSchema>;

let requireValue = <T extends string>(value: T | undefined | null, message: string): T => {
  if (value === undefined || value === null || value === '') {
    throw coinbaseServiceError(message);
  }
  return value;
};

let buildOrderConfiguration = (input: ManageOrdersInput) => {
  requireValue(input.productId, 'productId is required for preview/create');
  let side = requireValue(input.side, 'side is required for preview/create');
  let orderType = requireValue(input.orderType, 'orderType is required for preview/create');

  if (orderType === 'market') {
    if (side === 'BUY') {
      let quoteSize = requireValue(
        input.quoteSize,
        'quoteSize is required for market buy orders'
      );
      return { market_market_ioc: { quote_size: quoteSize } };
    }

    let baseSize = requireValue(input.baseSize, 'baseSize is required for market sell orders');
    return { market_market_ioc: { base_size: baseSize } };
  }

  if (orderType === 'limit_gtc' || orderType === 'limit_gtd') {
    let baseSize = requireValue(input.baseSize, 'baseSize is required for limit orders');
    let limitPrice = requireValue(input.limitPrice, 'limitPrice is required for limit orders');

    let limitConfig: Record<string, string | boolean> = {
      base_size: baseSize,
      limit_price: limitPrice,
      post_only: input.postOnly ?? false
    };
    if (input.quoteSize) limitConfig.quote_size = input.quoteSize;

    if (orderType === 'limit_gtd') {
      limitConfig.end_time = requireValue(
        input.endTime,
        'endTime is required for limit_gtd orders'
      );
      return { limit_limit_gtd: limitConfig };
    }

    return { limit_limit_gtc: limitConfig };
  }

  let baseSize = requireValue(input.baseSize, 'baseSize is required for stop-limit orders');
  let limitPrice = requireValue(
    input.limitPrice,
    'limitPrice is required for stop-limit orders'
  );
  let stopPrice = requireValue(input.stopPrice, 'stopPrice is required for stop-limit orders');
  let stopDirection = requireValue(
    input.stopDirection,
    'stopDirection is required for stop-limit orders'
  );

  let stopLimitConfig: Record<string, string> = {
    base_size: baseSize,
    limit_price: limitPrice,
    stop_price: stopPrice,
    stop_direction: stopDirection
  };

  if (orderType === 'stop_limit_gtd') {
    stopLimitConfig.end_time = requireValue(
      input.endTime,
      'endTime is required for stop_limit_gtd orders'
    );
    return { stop_limit_stop_limit_gtd: stopLimitConfig };
  }

  return { stop_limit_stop_limit_gtc: stopLimitConfig };
};

let requireOrderId = (order: any) => {
  let orderId = order?.order_id || order?.id;
  if (!orderId) {
    throw coinbaseServiceError('Coinbase order response did not include an order ID.');
  }
  return String(orderId);
};

let mapOrder = (order: any): z.infer<typeof orderOutputSchema> => ({
  orderId: requireOrderId(order),
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
});

let mapPreview = (preview: any): z.infer<typeof previewOutputSchema> => ({
  previewId: preview.preview_id,
  orderTotal: preview.order_total,
  commissionTotal: preview.commission_total,
  quoteSize: preview.quote_size === undefined ? undefined : String(preview.quote_size),
  baseSize: preview.base_size === undefined ? undefined : String(preview.base_size),
  bestBid: preview.best_bid,
  bestAsk: preview.best_ask,
  estimatedAverageFilledPrice: preview.est_average_filled_price,
  slippage: preview.slippage,
  errors: preview.errs,
  warnings: preview.warning
});

export let manageOrders = SlateTool.create(spec, {
  name: 'Manage Orders',
  key: 'manage_orders',
  description: `Preview, create, list, get, or cancel trading orders via the Advanced Trade API. Supports market, limit, and stop-limit orders. Use **action** to specify the operation.`,
  instructions: [
    'Use action=preview to validate and estimate an order before creating it.',
    'For market buy: provide quoteSize.',
    'For market sell: provide baseSize.',
    'For limit orders: provide baseSize, limitPrice, and optionally postOnly.',
    'For stop-limit orders: provide baseSize, limitPrice, stopPrice, and stopDirection.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .authMethods(coinbaseOAuthAuthMethods)
  .input(manageOrdersInputSchema)
  .output(
    z.object({
      order: orderOutputSchema.optional().describe('Single order details'),
      orders: z.array(orderOutputSchema).optional().describe('List of orders'),
      preview: previewOutputSchema.optional().describe('Order preview details'),
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

    if (action === 'preview') {
      let preview = await client.previewOrder({
        productId: ctx.input.productId!,
        side: ctx.input.side!,
        orderConfiguration: buildOrderConfiguration(ctx.input)
      });

      return {
        output: {
          preview: mapPreview(preview)
        },
        message: `Previewed ${ctx.input.side} ${ctx.input.orderType} order for **${ctx.input.productId}**`
      };
    }

    if (action === 'create') {
      let result = await client.createOrder({
        clientOrderId: `slate_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        productId: ctx.input.productId!,
        side: ctx.input.side!,
        orderConfiguration: buildOrderConfiguration(ctx.input)
      });

      if (!result.success) {
        let failure = result.error_response || {};
        throw coinbaseServiceError(
          `Order creation failed: ${failure.message || failure.error_details || failure.error || 'unknown error'}`
        );
      }

      let order = result.success_response || result;
      return {
        output: {
          order: {
            orderId: requireOrderId(order),
            productId: order.product_id || ctx.input.productId,
            side: order.side || ctx.input.side,
            orderType: ctx.input.orderType,
            status: 'PENDING'
          }
        },
        message: `Created ${ctx.input.side} ${ctx.input.orderType} order for **${ctx.input.productId}**`
      };
    }

    if (action === 'get') {
      if (!ctx.input.orderId) throw coinbaseServiceError('orderId is required for get');
      let order = await client.getOrder(ctx.input.orderId);
      return {
        output: {
          order: mapOrder(order)
        },
        message: `Order **${order.order_id}** — ${order.side} ${order.product_id} — Status: ${order.status}`
      };
    }

    if (action === 'cancel') {
      if (!ctx.input.orderIds || ctx.input.orderIds.length === 0) {
        throw coinbaseServiceError('orderIds is required for cancel');
      }
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

    let result = await client.listOrders({
      productId: ctx.input.productId,
      orderStatus: ctx.input.orderStatus,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let orders = result.orders || [];
    return {
      output: {
        orders: orders.map(mapOrder),
        hasNext: result.has_next,
        cursor: result.cursor
      },
      message: `Found **${orders.length}** order(s)${result.has_next ? ' (more available)' : ''}`
    };
  })
  .build();
