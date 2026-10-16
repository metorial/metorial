import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseObject, responseRows } from '../lib/response';
import { spec } from '../spec';

let snapshotResultSchema = z.object({
  error: z.string().optional().describe('Provider error for this ticker, if returned'),
  message: z.string().optional().describe('Provider message for this ticker'),
  marketStatus: z.string().optional().describe('Trading status for this asset'),
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
  updated: z
    .number()
    .optional()
    .describe('Provider update timestamp; units vary by asset endpoint'),
  value: z.number().optional().describe('Current value (for indices)')
});

export let getSnapshot = SlateTool.create(spec, {
  name: 'Get Snapshot',
  key: 'get_snapshot',
  description: `Get a current snapshot of market data for one or more tickers. Includes last trade, last quote, day OHLCV, previous day data, and percent change. Supports stocks, options, forex, crypto, and indices; freshness and available fields depend on the subscription. Multiple tickers use one request per symbol.
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
      snapshots: z
        .array(snapshotResultSchema)
        .optional()
        .describe('Array of ticker snapshots'),
      count: z.number().optional().describe('Number of snapshots returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.direction && ctx.input.tickers?.length)
      throw createApiServiceError(
        'Choose ticker symbols or gainers/losers, rather than both.'
      );
    let rawSnapshots: Record<string, any>[] | undefined;
    if (ctx.input.direction) {
      let data = await client.getGainersLosers(ctx.input.direction, {
        includeOtc: ctx.input.includeOtc
      });
      rawSnapshots = responseRows(data.tickers, 'snapshots');
    } else if (ctx.input.tickers?.length) {
      for (let ticker of ctx.input.tickers) {
        let rows: Record<string, any>[] | undefined;
        if (ticker.startsWith('I:')) {
          let data = await client.getIndicesSnapshot({ tickerAnyOf: [ticker] });
          rows = responseRows(data.results, 'index snapshots');
        } else if (ticker.startsWith('O:')) {
          let data = await client.getUniversalSnapshot({ tickerAnyOf: [ticker] });
          rows = responseRows(data.results, 'option snapshots');
        } else {
          let data = ticker.startsWith('X:')
            ? await client.getCryptoSnapshot(ticker)
            : ticker.startsWith('C:')
              ? await client.getForexSnapshot(ticker)
              : await client.getTickerSnapshot(ticker);
          rows = data.ticker == null ? undefined : [responseObject(data.ticker, 'snapshot')];
        }
        if (rows) rawSnapshots = [...(rawSnapshots ?? []), ...rows];
      }
    } else {
      let data = await client.getAllTickersSnapshot({ includeOtc: ctx.input.includeOtc });
      rawSnapshots = responseRows(data.tickers, 'snapshots');
    }

    let snapshots = rawSnapshots?.map((s: any) => ({
      error: s.error ?? undefined,
      message: s.message ?? undefined,
      marketStatus: s.market_status ?? undefined,
      ticker: s.ticker ?? undefined,
      name: s.name ?? undefined,
      type: s.type ?? undefined,
      market: s.market ?? undefined,
      lastTrade: s.lastTrade
        ? {
            price: s.lastTrade.p ?? undefined,
            size: s.lastTrade.s ?? undefined,
            timestamp: s.lastTrade.t ?? undefined,
            conditions: s.lastTrade.c ?? undefined,
            exchange: s.lastTrade.x ?? undefined
          }
        : s.last_trade
          ? {
              price: s.last_trade.price ?? undefined,
              size: s.last_trade.size ?? undefined,
              conditions: s.last_trade.conditions ?? undefined,
              exchange: s.last_trade.exchange ?? undefined,
              timestamp: s.last_trade.sip_timestamp ?? s.last_trade.last_updated ?? undefined
            }
          : undefined,
      lastQuote: s.lastQuote
        ? {
            bidPrice: s.lastQuote.p ?? s.lastQuote.b ?? undefined,
            bidSize: s.lastQuote.s ?? undefined,
            askPrice: s.lastQuote.P ?? s.lastQuote.a ?? undefined,
            askSize: s.lastQuote.S ?? undefined,
            timestamp: s.lastQuote.t ?? undefined
          }
        : s.last_quote
          ? {
              bidPrice: s.last_quote.bid ?? undefined,
              bidSize: s.last_quote.bid_size ?? undefined,
              askPrice: s.last_quote.ask ?? undefined,
              askSize: s.last_quote.ask_size ?? undefined,
              timestamp: s.last_quote.last_updated ?? undefined
            }
          : undefined,
      day: s.day
        ? {
            open: s.day.o ?? undefined,
            high: s.day.h ?? undefined,
            low: s.day.l ?? undefined,
            close: s.day.c ?? undefined,
            volume: s.day.v ?? undefined,
            volumeWeighted: s.day.vw ?? undefined
          }
        : s.session
          ? {
              open: s.session.open ?? undefined,
              high: s.session.high ?? undefined,
              low: s.session.low ?? undefined,
              close: s.session.close ?? undefined,
              volume: s.session.volume ?? undefined,
              volumeWeighted: s.session.vwap ?? undefined
            }
          : undefined,
      previousDay: s.prevDay
        ? {
            open: s.prevDay.o ?? undefined,
            high: s.prevDay.h ?? undefined,
            low: s.prevDay.l ?? undefined,
            close: s.prevDay.c ?? undefined,
            volume: s.prevDay.v ?? undefined,
            volumeWeighted: s.prevDay.vw ?? undefined
          }
        : s.prev_day
          ? {
              open: s.prev_day.o ?? undefined,
              high: s.prev_day.h ?? undefined,
              low: s.prev_day.l ?? undefined,
              close: s.prev_day.c ?? undefined,
              volume: s.prev_day.v ?? undefined,
              volumeWeighted: s.prev_day.vw ?? undefined
            }
          : undefined,
      changePercent: s.todaysChangePerc ?? s.session?.change_percent ?? undefined,
      updated: s.updated ?? s.last_updated ?? s.session?.last_updated ?? undefined,
      value: s.value ?? undefined
    }));

    return {
      output: {
        snapshots,
        count: snapshots?.length ?? undefined
      },
      message: ctx.input.direction
        ? `Retrieved **${snapshots?.length ?? 0}** top ${ctx.input.direction}.`
        : `Retrieved snapshots for **${snapshots?.length ?? 0}** ticker(s).`
    };
  })
  .build();
