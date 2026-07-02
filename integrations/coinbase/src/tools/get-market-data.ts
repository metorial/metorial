import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdvancedTradeClient } from '../lib/advanced-trade-client';
import { coinbaseOAuthAuthMethods } from '../lib/auth-methods';
import { spec } from '../spec';

let tradeSchema = z.object({
  tradeId: z.string().optional().describe('Trade ID'),
  productId: z.string().optional().describe('Product ID'),
  price: z.string().optional().describe('Trade price'),
  size: z.string().optional().describe('Trade size'),
  time: z.string().optional().describe('Trade timestamp'),
  side: z.string().optional().describe('Trade side'),
  exchange: z.string().optional().describe('Exchange')
});

let bookLevelSchema = z.object({
  price: z.string().optional().describe('Price level'),
  size: z.string().optional().describe('Size at level')
});

export let getMarketData = SlateTool.create(spec, {
  name: 'Get Market Data',
  key: 'get_market_data',
  description:
    'Get Advanced Trade market data for a product: recent trades and best bid/ask, or order book levels.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(coinbaseOAuthAuthMethods)
  .input(
    z.object({
      action: z.enum(['ticker', 'book']).describe('Market data view to retrieve'),
      productId: z.string().describe('Trading pair (e.g., BTC-USD)'),
      limit: z.number().optional().describe('Number of trades or order book levels'),
      start: z.string().optional().describe('Unix timestamp start filter for ticker trades'),
      end: z.string().optional().describe('Unix timestamp end filter for ticker trades'),
      aggregationPriceIncrement: z
        .string()
        .optional()
        .describe('Order book price aggregation increment')
    })
  )
  .output(
    z.object({
      ticker: z
        .object({
          bestBid: z.string().optional(),
          bestAsk: z.string().optional(),
          trades: z.array(tradeSchema).optional()
        })
        .optional()
        .describe('Ticker trades and best bid/ask'),
      orderBook: z
        .object({
          productId: z.string().optional(),
          bids: z.array(bookLevelSchema).optional(),
          asks: z.array(bookLevelSchema).optional(),
          time: z.string().optional(),
          last: z.string().optional(),
          midMarket: z.string().optional(),
          spreadBps: z.string().optional(),
          spreadAbsolute: z.string().optional()
        })
        .optional()
        .describe('Order book snapshot')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdvancedTradeClient({ token: ctx.auth.token });

    if (ctx.input.action === 'book') {
      let result = await client.getProductBook(ctx.input.productId, {
        limit: ctx.input.limit,
        aggregationPriceIncrement: ctx.input.aggregationPriceIncrement
      });
      let pricebook = result.pricebook || {};

      return {
        output: {
          orderBook: {
            productId: pricebook.product_id,
            bids: pricebook.bids || [],
            asks: pricebook.asks || [],
            time: pricebook.time,
            last: result.last,
            midMarket: result.mid_market,
            spreadBps: result.spread_bps,
            spreadAbsolute: result.spread_absolute
          }
        },
        message: `Retrieved order book for **${ctx.input.productId}**`
      };
    }

    let result = await client.getProductTicker(ctx.input.productId, {
      limit: ctx.input.limit,
      start: ctx.input.start,
      end: ctx.input.end
    });

    return {
      output: {
        ticker: {
          bestBid: result.best_bid,
          bestAsk: result.best_ask,
          trades: (result.trades || []).map((trade: any) => ({
            tradeId: trade.trade_id,
            productId: trade.product_id,
            price: trade.price,
            size: trade.size,
            time: trade.time,
            side: trade.side,
            exchange: trade.exchange
          }))
        }
      },
      message: `Retrieved market trades for **${ctx.input.productId}**`
    };
  })
  .build();
