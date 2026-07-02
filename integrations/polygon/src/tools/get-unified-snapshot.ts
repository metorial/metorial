import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let getUnifiedSnapshot = SlateTool.create(spec, {
  name: 'Get Unified Snapshot',
  key: 'get_unified_snapshot',
  description: `Retrieve unified snapshots for multiple tickers across different asset classes (stocks, options, forex, crypto, indices) in a single request. Consolidates last trade, last quote, session data, and price change metrics.`,
  instructions: [
    'Provide a comma-separated list of tickers from any asset class.',
    'Use appropriate prefixes: stocks (e.g., AAPL), forex (C:EURUSD), crypto (X:BTCUSD), indices (I:SPX), options (O:AAPL...).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tickers: z
        .string()
        .describe('Comma-separated list of tickers (e.g., "AAPL,C:EURUSD,X:BTCUSD,I:SPX")')
    })
  )
  .output(
    z.object({
      snapshots: z
        .array(
          z.object({
            ticker: z.string().optional().describe('Ticker symbol'),
            name: z.string().optional().describe('Asset name'),
            type: z.string().optional().describe('Asset type'),
            market: z.string().optional().describe('Market type'),
            lastTrade: z
              .object({
                price: z.number().optional(),
                size: z.number().optional(),
                timestamp: z.number().optional(),
                exchange: z.number().optional()
              })
              .optional()
              .describe('Last trade'),
            lastQuote: z
              .object({
                bid: z.number().optional(),
                bidSize: z.number().optional(),
                ask: z.number().optional(),
                askSize: z.number().optional(),
                timestamp: z.number().optional()
              })
              .optional()
              .describe('Last quote'),
            session: z
              .object({
                open: z.number().optional(),
                high: z.number().optional(),
                low: z.number().optional(),
                close: z.number().optional(),
                volume: z.number().optional(),
                previousClose: z.number().optional(),
                change: z.number().optional(),
                changePercent: z.number().optional()
              })
              .optional()
              .describe('Current session data')
          })
        )
        .describe('Unified snapshots across asset classes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    let response = await client.getUnifiedSnapshot({
      tickers: ctx.input.tickers
    });

    let snapshots = (response.results || []).map((r: any) => ({
      ticker: r.ticker,
      name: r.name,
      type: r.type,
      market: r.market_status,
      lastTrade: r.last_trade
        ? {
            price: r.last_trade.price,
            size: r.last_trade.size,
            timestamp: r.last_trade.last_updated,
            exchange: r.last_trade.exchange
          }
        : undefined,
      lastQuote: r.last_quote
        ? {
            bid: r.last_quote.bid,
            bidSize: r.last_quote.bid_size,
            ask: r.last_quote.ask,
            askSize: r.last_quote.ask_size,
            timestamp: r.last_quote.last_updated
          }
        : undefined,
      session: r.session
        ? {
            open: r.session.open,
            high: r.session.high,
            low: r.session.low,
            close: r.session.close,
            volume: r.session.volume,
            previousClose: r.session.previous_close,
            change: r.session.change,
            changePercent: r.session.change_percent
          }
        : undefined
    }));

    return {
      output: { snapshots },
      message: `Retrieved **${snapshots.length}** unified snapshots across multiple asset classes.`
    };
  })
  .build();
