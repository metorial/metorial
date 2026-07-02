import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdvancedTradeClient } from '../lib/advanced-trade-client';
import { coinbaseOAuthAuthMethods } from '../lib/auth-methods';
import { spec } from '../spec';

let fillSchema = z.object({
  fillId: z.string().optional().describe('Fill entry ID'),
  tradeId: z.string().optional().describe('Trade ID'),
  orderId: z.string().optional().describe('Order ID'),
  productId: z.string().optional().describe('Product ID'),
  tradeTime: z.string().optional().describe('Trade timestamp'),
  tradeType: z.string().optional().describe('Trade type'),
  price: z.string().optional().describe('Fill price'),
  size: z.string().optional().describe('Fill size'),
  commission: z.string().optional().describe('Commission amount'),
  side: z.string().optional().describe('BUY or SELL'),
  liquidityIndicator: z.string().optional().describe('Liquidity indicator'),
  sequenceTimestamp: z.string().optional().describe('Sequence timestamp'),
  sizeInQuote: z.boolean().optional().describe('Whether size is denominated in quote'),
  retailPortfolioId: z.string().optional().describe('Retail portfolio ID')
});

let mapFill = (fill: any): z.infer<typeof fillSchema> => ({
  fillId: fill.entry_id,
  tradeId: fill.trade_id,
  orderId: fill.order_id,
  productId: fill.product_id,
  tradeTime: fill.trade_time,
  tradeType: fill.trade_type,
  price: fill.price,
  size: fill.size,
  commission: fill.commission,
  side: fill.side,
  liquidityIndicator: fill.liquidity_indicator,
  sequenceTimestamp: fill.sequence_timestamp,
  sizeInQuote: fill.size_in_quote,
  retailPortfolioId: fill.retail_portfolio_id
});

export let listFills = SlateTool.create(spec, {
  name: 'List Fills',
  key: 'list_fills',
  description:
    'List Advanced Trade fills, filtered by order, trade, product, asset, side, type, or time range.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(coinbaseOAuthAuthMethods)
  .input(
    z.object({
      orderIds: z.array(z.string()).optional().describe('Order IDs to filter by'),
      tradeIds: z.array(z.string()).optional().describe('Trade IDs to filter by'),
      productIds: z.array(z.string()).optional().describe('Product IDs to filter by'),
      startSequenceTimestamp: z
        .string()
        .optional()
        .describe('Only fills after this RFC3339 timestamp'),
      endSequenceTimestamp: z
        .string()
        .optional()
        .describe('Only fills before this RFC3339 timestamp'),
      retailPortfolioId: z.string().optional().describe('Retail portfolio ID filter'),
      limit: z.number().optional().describe('Number of fills to return'),
      cursor: z.string().optional().describe('Pagination cursor'),
      sortBy: z.enum(['UNKNOWN_SORT_BY', 'PRICE', 'TRADE_TIME']).optional(),
      assetFilters: z.array(z.string()).optional().describe('Asset symbols to filter by'),
      orderTypes: z
        .array(
          z.enum([
            'UNKNOWN_ORDER_TYPE',
            'MARKET',
            'LIMIT',
            'STOP',
            'STOP_LIMIT',
            'BRACKET',
            'TWAP',
            'ROLL_OPEN',
            'ROLL_CLOSE',
            'LIQUIDATION',
            'SCALED'
          ])
        )
        .optional()
        .describe('Order types to filter by'),
      orderSide: z.enum(['BUY', 'SELL']).optional().describe('Order side filter'),
      productTypes: z
        .array(z.enum(['UNKNOWN_PRODUCT_TYPE', 'SPOT', 'FUTURE']))
        .optional()
        .describe('Product types to filter by'),
      proofToken: z
        .string()
        .optional()
        .describe('Optional proof token for SCA-protected fill history')
    })
  )
  .output(
    z.object({
      fills: z.array(fillSchema).describe('Matching fills'),
      cursor: z.string().optional().describe('Next page cursor'),
      proofTokenRequired: z.boolean().optional().describe('Whether proof token is required')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdvancedTradeClient({ token: ctx.auth.token });
    let result = await client.listFills(ctx.input);
    let fills = result.fills || [];

    return {
      output: {
        fills: fills.map(mapFill),
        cursor: result.cursor,
        proofTokenRequired: result.proof_token_required
      },
      message: `Found **${fills.length}** fill(s)`
    };
  })
  .build();
