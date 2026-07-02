import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let stockPriceChange = SlateTrigger.create(spec, {
  name: 'Stock Price Change',
  key: 'stock_price_change',
  description:
    'Triggers periodically with the latest snapshot data for monitored stock tickers. Provides current price, daily change, and volume information.'
})
  .input(
    z.object({
      ticker: z.string().describe('Stock ticker symbol'),
      snapshotTimestamp: z.number().optional().describe('Snapshot update timestamp'),
      todaysChange: z.number().optional().describe('Absolute price change'),
      todaysChangePercent: z.number().optional().describe('Percentage price change'),
      dayOpen: z.number().optional().describe('Day open price'),
      dayHigh: z.number().optional().describe('Day high price'),
      dayLow: z.number().optional().describe('Day low price'),
      dayClose: z.number().optional().describe('Day close/current price'),
      dayVolume: z.number().optional().describe('Day trading volume'),
      dayVwap: z.number().optional().describe('Volume-weighted average price'),
      prevDayClose: z.number().optional().describe('Previous day close price'),
      prevDayVolume: z.number().optional().describe('Previous day volume'),
      lastTradePrice: z.number().optional().describe('Last trade price'),
      lastTradeSize: z.number().optional().describe('Last trade size'),
      lastTradeTimestamp: z.number().optional().describe('Last trade timestamp')
    })
  )
  .output(
    z.object({
      ticker: z.string().describe('Stock ticker symbol'),
      todaysChange: z.number().optional().describe('Absolute price change'),
      todaysChangePercent: z.number().optional().describe('Percentage price change'),
      dayOpen: z.number().optional().describe('Day open price'),
      dayHigh: z.number().optional().describe('Day high price'),
      dayLow: z.number().optional().describe('Day low price'),
      dayClose: z.number().optional().describe('Day close/current price'),
      dayVolume: z.number().optional().describe('Day trading volume'),
      dayVwap: z.number().optional().describe('Volume-weighted average price'),
      prevDayClose: z.number().optional().describe('Previous day close price'),
      prevDayVolume: z.number().optional().describe('Previous day volume'),
      lastTradePrice: z.number().optional().describe('Last trade price'),
      lastTradeSize: z.number().optional().describe('Last trade size'),
      lastTradeTimestamp: z.number().optional().describe('Last trade timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new PolygonClient(ctx.auth.token);

      let tickers = (ctx.state?.tickers as string) || 'AAPL,MSFT,GOOG,AMZN,TSLA';

      let response = await client.getAllStockSnapshots({ tickers });

      let snapshots = response.tickers || [];

      let lastTimestamps = (ctx.state?.lastTimestamps || {}) as Record<string, number>;

      let inputs = snapshots
        .filter((t: any) => {
          let prevTimestamp = lastTimestamps[t.ticker];
          return !prevTimestamp || t.updated !== prevTimestamp;
        })
        .map((t: any) => ({
          ticker: t.ticker,
          snapshotTimestamp: t.updated,
          todaysChange: t.todaysChange,
          todaysChangePercent: t.todaysChangePerc,
          dayOpen: t.day?.o,
          dayHigh: t.day?.h,
          dayLow: t.day?.l,
          dayClose: t.day?.c,
          dayVolume: t.day?.v,
          dayVwap: t.day?.vw,
          prevDayClose: t.prevDay?.c,
          prevDayVolume: t.prevDay?.v,
          lastTradePrice: t.lastTrade?.p,
          lastTradeSize: t.lastTrade?.s,
          lastTradeTimestamp: t.lastTrade?.t
        }));

      let updatedTimestamps: Record<string, number> = { ...lastTimestamps };
      for (let t of snapshots) {
        if (t.updated) {
          updatedTimestamps[t.ticker] = t.updated;
        }
      }

      return {
        inputs,
        updatedState: {
          tickers,
          lastTimestamps: updatedTimestamps
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'stock.price_updated',
        id: `${ctx.input.ticker}_${ctx.input.snapshotTimestamp || Date.now()}`,
        output: {
          ticker: ctx.input.ticker,
          todaysChange: ctx.input.todaysChange,
          todaysChangePercent: ctx.input.todaysChangePercent,
          dayOpen: ctx.input.dayOpen,
          dayHigh: ctx.input.dayHigh,
          dayLow: ctx.input.dayLow,
          dayClose: ctx.input.dayClose,
          dayVolume: ctx.input.dayVolume,
          dayVwap: ctx.input.dayVwap,
          prevDayClose: ctx.input.prevDayClose,
          prevDayVolume: ctx.input.prevDayVolume,
          lastTradePrice: ctx.input.lastTradePrice,
          lastTradeSize: ctx.input.lastTradeSize,
          lastTradeTimestamp: ctx.input.lastTradeTimestamp
        }
      };
    }
  })
  .build();
