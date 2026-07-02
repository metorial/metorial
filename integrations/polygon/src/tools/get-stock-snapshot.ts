import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

let snapshotBarSchema = z
  .object({
    open: z.number().optional(),
    high: z.number().optional(),
    low: z.number().optional(),
    close: z.number().optional(),
    volume: z.number().optional(),
    volumeWeightedAvgPrice: z.number().optional()
  })
  .optional();

let snapshotOutputSchema = z.object({
  ticker: z.string().describe('Ticker symbol'),
  todaysChange: z.number().optional().describe('Price change from previous trading day'),
  todaysChangePercent: z
    .number()
    .optional()
    .describe('Percentage change from previous trading day'),
  updatedAt: z.number().optional().describe('Last updated Unix nanosecond timestamp'),
  day: snapshotBarSchema.describe('Current day aggregate bar'),
  prevDay: snapshotBarSchema.describe('Previous day aggregate bar'),
  min: snapshotBarSchema.describe('Most recent minute bar'),
  lastTrade: z
    .object({
      price: z.number().optional(),
      size: z.number().optional(),
      timestamp: z.number().optional(),
      conditions: z.array(z.number()).optional(),
      exchange: z.number().optional()
    })
    .optional()
    .describe('Last trade'),
  lastQuote: z
    .object({
      bidPrice: z.number().optional(),
      bidSize: z.number().optional(),
      askPrice: z.number().optional(),
      askSize: z.number().optional(),
      timestamp: z.number().optional()
    })
    .optional()
    .describe('Last quote (NBBO)')
});

let mapSnapshotBar = (bar: any) => {
  if (!bar) return undefined;
  return {
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
    volumeWeightedAvgPrice: bar.vw
  };
};

let mapSnapshot = (t: any) => ({
  ticker: t.ticker,
  todaysChange: t.todaysChange,
  todaysChangePercent: t.todaysChangePerc,
  updatedAt: t.updated,
  day: mapSnapshotBar(t.day),
  prevDay: mapSnapshotBar(t.prevDay),
  min: mapSnapshotBar(t.min),
  lastTrade: t.lastTrade
    ? {
        price: t.lastTrade.p,
        size: t.lastTrade.s,
        timestamp: t.lastTrade.t,
        conditions: t.lastTrade.c,
        exchange: t.lastTrade.x
      }
    : undefined,
  lastQuote: t.lastQuote
    ? {
        bidPrice: t.lastQuote.p ?? t.lastQuote.P,
        bidSize: t.lastQuote.s ?? t.lastQuote.S,
        askPrice: t.lastQuote.P ?? t.lastQuote.p,
        askSize: t.lastQuote.S ?? t.lastQuote.s,
        timestamp: t.lastQuote.t
      }
    : undefined
});

export let getStockSnapshot = SlateTool.create(spec, {
  name: 'Get Stock Snapshot',
  key: 'get_stock_snapshot',
  description: `Retrieve a current market snapshot for one or more stock tickers. Returns the current day bar, previous day bar, last minute bar, last trade, last quote, and daily price change. Use this to get a comprehensive real-time overview of a stock's market status.`,
  instructions: [
    'Provide a single ticker for detailed snapshot, or a comma-separated list for multiple tickers.',
    'Snapshot data is cleared at 3:30 AM EST and populates as data arrives from exchanges (as early as 4 AM EST).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tickers: z
        .string()
        .describe(
          'Comma-separated list of stock ticker symbols (e.g., "AAPL" or "AAPL,TSLA,GOOG")'
        ),
      includeOtc: z.boolean().optional().describe('Include OTC securities. Defaults to false.')
    })
  )
  .output(
    z.object({
      snapshots: z.array(snapshotOutputSchema).describe('Array of stock snapshots')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    let tickerList = ctx.input.tickers.split(',').map(t => t.trim());
    let isSingle = tickerList.length === 1;

    let snapshots: any[];
    if (isSingle) {
      let response = await client.getStockSnapshot(tickerList[0] as string);
      snapshots = response.ticker ? [response.ticker] : [];
    } else {
      let response = await client.getAllStockSnapshots({
        tickers: ctx.input.tickers,
        includeOtc: ctx.input.includeOtc
      });
      snapshots = response.tickers || [];
    }

    let mappedSnapshots = snapshots.map(mapSnapshot);

    return {
      output: {
        snapshots: mappedSnapshots
      },
      message: `Retrieved snapshots for **${mappedSnapshots.length}** stock ticker(s): ${tickerList.join(', ')}.`
    };
  })
  .build();
