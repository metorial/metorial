import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let priceChangeInputSchema = z.object({
  eventId: z.string().describe('Unique event ID'),
  ticker: z.string().describe('Ticker symbol'),
  previousClose: z.number().describe('Previous close price'),
  currentPrice: z.number().describe('Current last trade price'),
  changeAmount: z.number().describe('Price change amount'),
  changePercent: z.number().describe('Price change percent'),
  dayOpen: z.number().optional().describe('Day open price'),
  dayHigh: z.number().optional().describe('Day high price'),
  dayLow: z.number().optional().describe('Day low price'),
  dayVolume: z.number().optional().describe('Day volume'),
  timestamp: z.number().optional().describe('Last update timestamp')
});

export let stockPriceChange = SlateTrigger.create(spec, {
  name: 'Stock Price Change',
  key: 'stock_price_change',
  description:
    'Triggers when a monitored stock has a significant daily price change. Polls snapshot data and detects price movements compared to the previous close.'
})
  .input(priceChangeInputSchema)
  .output(
    z.object({
      ticker: z.string().describe('Ticker symbol'),
      previousClose: z.number().describe('Previous close price'),
      currentPrice: z.number().describe('Current last trade price'),
      changeAmount: z.number().describe('Price change amount from previous close'),
      changePercent: z.number().describe('Price change percent from previous close'),
      dayOpen: z.number().optional().describe('Day open price'),
      dayHigh: z.number().optional().describe('Day high price'),
      dayLow: z.number().optional().describe('Day low price'),
      dayVolume: z.number().optional().describe('Day trading volume'),
      timestamp: z.number().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let data = await client.getGainersLosers('gainers', { includeOtc: false });
      let gainers = data.tickers || [];

      let losersData = await client.getGainersLosers('losers', { includeOtc: false });
      let losers = losersData.tickers || [];

      let movers = [...gainers, ...losers];

      let lastSeenUpdates =
        (ctx.state?.lastSeenUpdates as Record<string, number> | undefined) || {};

      let inputs = movers
        .filter((s: any) => {
          let lastUpdate = s.updated;
          let previousUpdate = lastSeenUpdates[s.ticker];
          return !previousUpdate || lastUpdate !== previousUpdate;
        })
        .map((s: any) => {
          let prevClose = s.prevDay?.c || 0;
          let current = s.lastTrade?.p || s.day?.c || 0;
          let changeAmount = current - prevClose;
          let changePercent = prevClose > 0 ? (changeAmount / prevClose) * 100 : 0;

          return {
            eventId: `${s.ticker}-${s.updated}`,
            ticker: s.ticker,
            previousClose: prevClose,
            currentPrice: current,
            changeAmount: Math.round(changeAmount * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            dayOpen: s.day?.o,
            dayHigh: s.day?.h,
            dayLow: s.day?.l,
            dayVolume: s.day?.v,
            timestamp: s.updated
          };
        });

      let updatedSeenMap: Record<string, number> = {};
      for (let m of movers) {
        updatedSeenMap[m.ticker] = m.updated;
      }

      return {
        inputs,
        updatedState: {
          lastSeenUpdates: updatedSeenMap
        }
      };
    },

    handleEvent: async ctx => {
      let direction = ctx.input.changePercent >= 0 ? 'up' : 'down';

      return {
        type: `stock.price_${direction}`,
        id: ctx.input.eventId,
        output: {
          ticker: ctx.input.ticker,
          previousClose: ctx.input.previousClose,
          currentPrice: ctx.input.currentPrice,
          changeAmount: ctx.input.changeAmount,
          changePercent: ctx.input.changePercent,
          dayOpen: ctx.input.dayOpen,
          dayHigh: ctx.input.dayHigh,
          dayLow: ctx.input.dayLow,
          dayVolume: ctx.input.dayVolume,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
