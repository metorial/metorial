import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import {
  optionalBoolean,
  optionalNumber,
  optionalString,
  requiredString
} from '../lib/response';
import { spec } from '../spec';

export let getQuote = SlateTool.create(spec, {
  name: 'Get Quote',
  key: 'get_quote',
  description: `Retrieve the latest available quote for a financial instrument, including current price, daily change, volume, 52-week range, and other key metrics.
Freshness depends on exchange coverage, subscription entitlements, and market sessions. Provides a snapshot of available market data for stocks, forex, crypto, ETFs, and more.`,
  instructions: [
    'Use the symbol format "AAPL" for stocks, "EUR/USD" for forex, "BTC/USD" for crypto.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Ticker symbol (e.g., "AAPL", "EUR/USD", "BTC/USD")'),
      interval: z
        .enum([
          '1min',
          '5min',
          '15min',
          '30min',
          '45min',
          '1h',
          '2h',
          '4h',
          '8h',
          '1day',
          '1week',
          '1month'
        ])
        .optional()
        .describe('Time interval for the quote (default: "1day")'),
      exchange: z.string().optional().describe('Exchange where the instrument is traded'),
      country: z.string().optional().describe('Country of the exchange'),
      prepost: z.boolean().optional().describe('Include pre/post market data for US equities')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete provider response, preserving unavailable values and metadata'),
      symbol: z.string().describe('Ticker symbol'),
      name: z.string().optional().describe('Instrument name'),
      exchange: z.string().optional().describe('Exchange name'),
      micCode: z.string().optional().describe('Market Identifier Code'),
      currency: z.string().optional().describe('Currency'),
      datetime: z
        .string()
        .optional()
        .describe('Bar opening date/time in the provider timezone'),
      timestamp: z
        .number()
        .optional()
        .describe(
          'Bar opening Unix timestamp in seconds; this is not necessarily the last update time'
        ),
      lastQuoteAt: z
        .number()
        .optional()
        .describe('Provider last-minute candle Unix timestamp in seconds'),
      open: z.string().optional().describe('Opening price for the quote interval'),
      high: z.string().optional().describe('High for the quote interval'),
      low: z.string().optional().describe('Low for the quote interval'),
      close: z.string().optional().describe('Current/closing price'),
      volume: z.string().optional().describe('Trading volume'),
      previousClose: z.string().optional().describe('Previous closing price'),
      change: z.string().optional().describe('Price change'),
      percentChange: z.string().optional().describe('Percentage change'),
      averageVolume: z.string().optional().describe('Average volume'),
      isMarketOpen: z.boolean().optional().describe('Whether the market is currently open'),
      fiftyTwoWeekLow: z.string().optional().describe('52-week low'),
      fiftyTwoWeekHigh: z.string().optional().describe('52-week high'),
      fiftyTwoWeekLowChange: z.string().optional().describe('Change from 52-week low'),
      fiftyTwoWeekHighChange: z.string().optional().describe('Change from 52-week high'),
      fiftyTwoWeekLowChangePercent: z
        .string()
        .optional()
        .describe('Percent change from 52-week low'),
      fiftyTwoWeekHighChangePercent: z
        .string()
        .optional()
        .describe('Percent change from 52-week high')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwelveDataClient(ctx.auth.token);

    let result = await client.getQuote({
      symbol: ctx.input.symbol,
      interval: ctx.input.interval,
      exchange: ctx.input.exchange,
      country: ctx.input.country,
      prepost: ctx.input.prepost
    });

    return {
      output: {
        raw: result,
        symbol: requiredString(result.symbol, 'symbol'),
        name: optionalString(result.name),
        exchange: optionalString(result.exchange),
        micCode: optionalString(result.mic_code),
        currency: optionalString(result.currency),
        datetime: optionalString(result.datetime),
        timestamp: optionalNumber(result.timestamp),
        lastQuoteAt: optionalNumber(result.last_quote_at),
        open: optionalString(result.open),
        high: optionalString(result.high),
        low: optionalString(result.low),
        close: optionalString(result.close),
        volume: optionalString(result.volume),
        previousClose: optionalString(result.previous_close),
        change: optionalString(result.change),
        percentChange: optionalString(result.percent_change),
        averageVolume: optionalString(result.average_volume),
        isMarketOpen: optionalBoolean(result.is_market_open),
        fiftyTwoWeekLow: optionalString(result.fifty_two_week?.low),
        fiftyTwoWeekHigh: optionalString(result.fifty_two_week?.high),
        fiftyTwoWeekLowChange: optionalString(result.fifty_two_week?.low_change),
        fiftyTwoWeekHighChange: optionalString(result.fifty_two_week?.high_change),
        fiftyTwoWeekLowChangePercent: optionalString(
          result.fifty_two_week?.low_change_percent
        ),
        fiftyTwoWeekHighChangePercent: optionalString(
          result.fifty_two_week?.high_change_percent
        )
      },
      message: `Retrieved the latest available quote for **${result.symbol}**; use the returned timestamps and market-open state to assess freshness.`
    };
  })
  .build();
