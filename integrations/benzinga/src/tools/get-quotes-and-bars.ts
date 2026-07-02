import { SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient } from '../lib/client';
import { spec } from '../spec';

let quoteSchema = z.object({
  symbol: z.string().optional().describe('Ticker symbol'),
  name: z.string().optional().describe('Company name'),
  open: z.number().optional().describe('Opening price'),
  high: z.number().optional().describe('Daily high'),
  low: z.number().optional().describe('Daily low'),
  close: z.number().optional().describe('Closing price'),
  last: z.number().optional().describe('Last traded price'),
  previousClose: z.number().optional().describe('Previous close price'),
  change: z.number().optional().describe('Price change'),
  changePercent: z.number().optional().describe('Percentage change'),
  volume: z.number().optional().describe('Trading volume'),
  fiftyTwoWeekHigh: z.number().optional().describe('52-week high'),
  fiftyTwoWeekLow: z.number().optional().describe('52-week low'),
  date: z.string().optional().describe('Quote date'),
  currency: z.string().optional().describe('Currency')
});

let candleSchema = z.object({
  open: z.number().optional().describe('Opening price'),
  high: z.number().optional().describe('High price'),
  low: z.number().optional().describe('Low price'),
  close: z.number().optional().describe('Closing price'),
  volume: z.number().optional().describe('Trading volume'),
  time: z.number().optional().describe('Unix timestamp (ms)'),
  dateTime: z.string().optional().describe('ISO 8601 datetime')
});

let barResponseSchema = z.object({
  symbol: z.string().optional().describe('Ticker symbol'),
  candles: z.array(candleSchema).optional().describe('Price bar candles')
});

export let getQuotesTool = SlateTool.create(spec, {
  name: 'Get Delayed Quotes',
  key: 'get_delayed_quotes',
  description: `Retrieve delayed stock quotes for one or more securities. Returns current price, change, volume, and 52-week range data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      symbols: z.string().describe('Comma-separated ticker symbols (e.g. "AAPL,MSFT,GOOG")')
    })
  )
  .output(
    z.object({
      quotes: z.array(quoteSchema).describe('Delayed quote data for requested securities'),
      count: z.number().describe('Number of quotes returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BenzingaClient({ token: ctx.auth.token });

    let data = await client.getDelayedQuotes({ symbols: ctx.input.symbols });

    let quotesArray = data?.quotes || (Array.isArray(data) ? data : []);
    let quotes = quotesArray.map((q: any) => ({
      symbol: q.security?.symbol || q.symbol,
      name: q.security?.name || q.name,
      open: q.quote?.open ?? q.open,
      high: q.quote?.high ?? q.high,
      low: q.quote?.low ?? q.low,
      close: q.quote?.close ?? q.close,
      last: q.quote?.last ?? q.last,
      previousClose: q.quote?.previousClose ?? q.previousClose,
      change: q.quote?.change ?? q.change,
      changePercent: q.quote?.changePercent ?? q.changePercent,
      volume: q.quote?.volume ?? q.volume,
      fiftyTwoWeekHigh: q.quote?.fiftyTwoWeekHigh ?? q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.quote?.fiftyTwoWeekLow ?? q.fiftyTwoWeekLow,
      date: q.quote?.date ?? q.date,
      currency: q.quote?.currency ?? q.currency
    }));

    return {
      output: {
        quotes,
        count: quotes.length
      },
      message: `Retrieved **${quotes.length}** delayed quote(s) for: ${ctx.input.symbols}.`
    };
  })
  .build();

export let getHistoricalBarsTool = SlateTool.create(spec, {
  name: 'Get Historical Bars',
  key: 'get_historical_bars',
  description: `Retrieve historical OHLCV (Open, High, Low, Close, Volume) price bar data for securities. Supports multiple intervals from 5-minute to monthly candles.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      symbols: z.string().describe('Comma-separated ticker symbols (e.g. "AAPL,MSFT")'),
      from: z
        .string()
        .optional()
        .describe('Start date (YYYY-MM-DD or relative like "YTD", "1MONTH", "1D")'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)'),
      interval: z
        .enum(['5M', '15M', '30M', '1H', '1D', '1W', '1MONTH'])
        .optional()
        .default('1D')
        .describe('Candle interval')
    })
  )
  .output(
    z.object({
      bars: z.array(barResponseSchema).describe('Historical bar data per symbol'),
      count: z.number().describe('Number of symbols with bar data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BenzingaClient({ token: ctx.auth.token });

    let data = await client.getBars({
      symbols: ctx.input.symbols,
      from: ctx.input.from,
      to: ctx.input.to,
      interval: ctx.input.interval
    });

    let bars = (Array.isArray(data) ? data : []).map((item: any) => ({
      symbol: item.symbol,
      candles: (item.candles || []).map((c: any) => ({
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        time: c.time,
        dateTime: c.dateTime
      }))
    }));

    let totalCandles = bars.reduce((sum: number, b: any) => sum + (b.candles?.length || 0), 0);

    return {
      output: {
        bars,
        count: bars.length
      },
      message: `Retrieved **${totalCandles}** candle(s) across **${bars.length}** symbol(s) with ${ctx.input.interval} interval.`
    };
  })
  .build();
