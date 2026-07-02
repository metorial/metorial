import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let snapshotResultSchema = z.object({
  ticker: z.string().optional().describe('Ticker symbol'),
  name: z.string().optional().describe('Name of the asset'),
  type: z.string().optional().describe('Asset type'),
  market: z.string().optional().describe('Market type'),
  lastTrade: z
    .object({
      price: z.number().optional(),
      size: z.number().optional(),
      timestamp: z.number().optional(),
      conditions: z.array(z.number()).optional(),
      exchange: z.number().optional()
    })
    .optional()
    .describe('Last trade data'),
  lastQuote: z
    .object({
      bidPrice: z.number().optional(),
      bidSize: z.number().optional(),
      askPrice: z.number().optional(),
      askSize: z.number().optional(),
      timestamp: z.number().optional()
    })
    .optional()
    .describe('Last quote data'),
  day: z
    .object({
      open: z.number().optional(),
      high: z.number().optional(),
      low: z.number().optional(),
      close: z.number().optional(),
      volume: z.number().optional(),
      volumeWeighted: z.number().optional()
    })
    .optional()
    .describe('Current day aggregate data'),
  previousDay: z
    .object({
      open: z.number().optional(),
      high: z.number().optional(),
      low: z.number().optional(),
      close: z.number().optional(),
      volume: z.number().optional(),
      volumeWeighted: z.number().optional()
    })
    .optional()
    .describe('Previous day aggregate data'),
  changePercent: z.number().optional().describe('Percent change from previous close'),
  updated: z.number().optional().describe('Last updated timestamp (nanoseconds)'),
  value: z.number().optional().describe('Current value (for indices)')
});

export let getSnapshot = SlateTool.create(spec, {
  name: 'Get Snapshot',
  key: 'get_snapshot',
  description: `Get a unified real-time snapshot of current market data for one or more tickers. Includes last trade, last quote, day OHLCV, previous day data, and percent change. Supports stocks, options, forex, crypto, and indices.
Use this to quickly check current prices and daily statistics without fetching historical data.`,
  instructions: [
    'Provide one or more ticker symbols to get their current snapshot.',
    'For top gainers or losers, set direction to "gainers" or "losers" without specifying tickers.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tickers: z
        .array(z.string())
        .optional()
        .describe('One or more ticker symbols to snapshot'),
      direction: z
        .enum(['gainers', 'losers'])
        .optional()
        .describe('Get top gainers or losers instead of specific tickers'),
      includeOtc: z.boolean().optional().describe('Include OTC securities in results')
    })
  )
  .output(
    z.object({
      snapshots: z.array(snapshotResultSchema).describe('Array of ticker snapshots'),
      count: z.number().describe('Number of snapshots returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let rawSnapshots: any[] = [];

    if (ctx.input.direction) {
      let data = await client.getGainersLosers(ctx.input.direction, {
        includeOtc: ctx.input.includeOtc
      });
      rawSnapshots = data.tickers || [];
    } else if (ctx.input.tickers && ctx.input.tickers.length === 1) {
      let ticker = ctx.input.tickers[0]!;

      if (ticker.startsWith('I:')) {
        let data = await client.getIndicesSnapshot({ tickerAnyOf: [ticker] });
        rawSnapshots = data.results || [];
      } else if (ticker.startsWith('X:')) {
        let data = await client.getCryptoSnapshot(ticker);
        rawSnapshots = data.ticker ? [data.ticker] : [];
      } else if (ticker.startsWith('C:')) {
        let data = await client.getForexSnapshot(ticker);
        rawSnapshots = data.ticker ? [data.ticker] : [];
      } else {
        let data = await client.getTickerSnapshot(ticker);
        rawSnapshots = data.ticker ? [data.ticker] : [];
      }
    } else if (ctx.input.tickers && ctx.input.tickers.length > 1) {
      let hasIndices = ctx.input.tickers.some(t => t.startsWith('I:'));
      if (hasIndices) {
        let data = await client.getUniversalSnapshot({ tickerAnyOf: ctx.input.tickers });
        rawSnapshots = data.results || [];
      } else {
        let data = await client.getAllTickersSnapshot({
          tickers: ctx.input.tickers,
          includeOtc: ctx.input.includeOtc
        });
        rawSnapshots = data.tickers || [];
      }
    } else {
      let data = await client.getAllTickersSnapshot({
        includeOtc: ctx.input.includeOtc
      });
      rawSnapshots = data.tickers || [];
    }

    let snapshots = rawSnapshots.map((s: any) => ({
      ticker: s.ticker,
      name: s.name,
      type: s.type,
      market: s.market,
      lastTrade: s.lastTrade
        ? {
            price: s.lastTrade.p,
            size: s.lastTrade.s,
            timestamp: s.lastTrade.t,
            conditions: s.lastTrade.c,
            exchange: s.lastTrade.x
          }
        : s.last_trade
          ? {
              price: s.last_trade.price,
              size: s.last_trade.size,
              timestamp: s.last_trade.sip_timestamp || s.last_trade.timestamp
            }
          : undefined,
      lastQuote: s.lastQuote
        ? {
            bidPrice: s.lastQuote.P || s.lastQuote.p,
            bidSize: s.lastQuote.S || s.lastQuote.s,
            askPrice: s.lastQuote.p,
            askSize: s.lastQuote.s,
            timestamp: s.lastQuote.t
          }
        : s.last_quote
          ? {
              bidPrice: s.last_quote.bid_price,
              bidSize: s.last_quote.bid_size,
              askPrice: s.last_quote.ask_price,
              askSize: s.last_quote.ask_size,
              timestamp: s.last_quote.sip_timestamp || s.last_quote.timestamp
            }
          : undefined,
      day: s.day
        ? {
            open: s.day.o,
            high: s.day.h,
            low: s.day.l,
            close: s.day.c,
            volume: s.day.v,
            volumeWeighted: s.day.vw
          }
        : s.session
          ? {
              open: s.session.open,
              high: s.session.high,
              low: s.session.low,
              close: s.session.close,
              volume: s.session.volume
            }
          : undefined,
      previousDay: s.prevDay
        ? {
            open: s.prevDay.o,
            high: s.prevDay.h,
            low: s.prevDay.l,
            close: s.prevDay.c,
            volume: s.prevDay.v,
            volumeWeighted: s.prevDay.vw
          }
        : s.prev_day
          ? {
              open: s.prev_day.o,
              high: s.prev_day.h,
              low: s.prev_day.l,
              close: s.prev_day.c,
              volume: s.prev_day.v,
              volumeWeighted: s.prev_day.vw
            }
          : undefined,
      changePercent: s.todaysChangePerc ?? s.change_percent,
      updated: s.updated,
      value: s.value
    }));

    return {
      output: {
        snapshots,
        count: snapshots.length
      },
      message: ctx.input.direction
        ? `Retrieved **${snapshots.length}** top ${ctx.input.direction}.`
        : `Retrieved snapshots for **${snapshots.length}** ticker(s).`
    };
  })
  .build();
