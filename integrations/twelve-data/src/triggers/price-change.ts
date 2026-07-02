import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { spec } from '../spec';

export let priceChange = SlateTrigger.create(spec, {
  name: 'Price Change',
  key: 'price_change',
  description:
    'Polls for price changes on specified financial instruments and emits events with the latest quote data including price, change, and volume.'
})
  .input(
    z.object({
      symbol: z.string().describe('Ticker symbol'),
      datetime: z.string().describe('Timestamp of the quote'),
      price: z.string().describe('Current price'),
      change: z.string().optional().describe('Price change since previous close'),
      percentChange: z.string().optional().describe('Percentage change since previous close'),
      previousClose: z.string().optional().describe('Previous closing price'),
      open: z.string().optional().describe('Opening price'),
      high: z.string().optional().describe('Daily high'),
      low: z.string().optional().describe('Daily low'),
      volume: z.string().optional().describe('Trading volume'),
      isMarketOpen: z.boolean().optional().describe('Whether the market is open')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Ticker symbol'),
      price: z.string().describe('Current price'),
      change: z.string().optional().describe('Price change since previous close'),
      percentChange: z.string().optional().describe('Percentage change since previous close'),
      previousClose: z.string().optional().describe('Previous closing price'),
      open: z.string().optional().describe('Opening price'),
      high: z.string().optional().describe('Daily high'),
      low: z.string().optional().describe('Daily low'),
      volume: z.string().optional().describe('Trading volume'),
      datetime: z.string().describe('Quote timestamp'),
      isMarketOpen: z.boolean().optional().describe('Whether the market is open')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new TwelveDataClient(ctx.auth.token);

      let state = ctx.state as {
        lastPrices?: Record<string, string>;
        symbols?: string;
      } | null;
      let symbolsStr = state?.symbols || 'AAPL';
      let symbolsList = symbolsStr
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      let lastPrices: Record<string, string> = state?.lastPrices || {};

      let inputs: Array<{
        symbol: string;
        datetime: string;
        price: string;
        change?: string;
        percentChange?: string;
        previousClose?: string;
        open?: string;
        high?: string;
        low?: string;
        volume?: string;
        isMarketOpen?: boolean;
      }> = [];

      let updatedPrices: Record<string, string> = { ...lastPrices };

      for (let symbol of symbolsList) {
        try {
          let quote = await client.getQuote({ symbol });

          let currentPrice = quote.close || quote.price;
          let previousPrice = lastPrices[symbol];

          if (currentPrice && currentPrice !== previousPrice) {
            updatedPrices[symbol] = currentPrice;

            inputs.push({
              symbol: quote.symbol || symbol,
              datetime: quote.datetime || new Date().toISOString(),
              price: currentPrice,
              change: quote.change,
              percentChange: quote.percent_change,
              previousClose: quote.previous_close,
              open: quote.open,
              high: quote.high,
              low: quote.low,
              volume: quote.volume,
              isMarketOpen: quote.is_market_open
            });
          } else {
            updatedPrices[symbol] = currentPrice || previousPrice || '';
          }
        } catch (_err) {
          // Skip symbols that fail to fetch
        }
      }

      return {
        inputs,
        updatedState: {
          symbols: symbolsStr,
          lastPrices: updatedPrices
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'price.changed',
        id: `${ctx.input.symbol}-${ctx.input.datetime}-${ctx.input.price}`,
        output: {
          symbol: ctx.input.symbol,
          price: ctx.input.price,
          change: ctx.input.change,
          percentChange: ctx.input.percentChange,
          previousClose: ctx.input.previousClose,
          open: ctx.input.open,
          high: ctx.input.high,
          low: ctx.input.low,
          volume: ctx.input.volume,
          datetime: ctx.input.datetime,
          isMarketOpen: ctx.input.isMarketOpen
        }
      };
    }
  })
  .build();
