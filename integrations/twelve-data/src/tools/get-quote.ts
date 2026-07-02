import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { spec } from '../spec';

export let getQuote = SlateTool.create(spec, {
  name: 'Get Quote',
  key: 'get_quote',
  description: `Retrieve a real-time quote for a financial instrument, including current price, daily change, volume, 52-week range, and other key metrics.
Provides a comprehensive snapshot of current market data for stocks, forex, crypto, ETFs, and more.`,
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
      symbol: z.string().describe('Ticker symbol'),
      name: z.string().optional().describe('Instrument name'),
      exchange: z.string().optional().describe('Exchange name'),
      micCode: z.string().optional().describe('Market Identifier Code'),
      currency: z.string().optional().describe('Currency'),
      datetime: z.string().optional().describe('Quote timestamp'),
      timestamp: z.number().optional().describe('Unix timestamp'),
      open: z.string().optional().describe('Opening price'),
      high: z.string().optional().describe('Daily high'),
      low: z.string().optional().describe('Daily low'),
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
        symbol: result.symbol || ctx.input.symbol,
        name: result.name,
        exchange: result.exchange,
        micCode: result.mic_code,
        currency: result.currency,
        datetime: result.datetime,
        timestamp: result.timestamp,
        open: result.open,
        high: result.high,
        low: result.low,
        close: result.close,
        volume: result.volume,
        previousClose: result.previous_close,
        change: result.change,
        percentChange: result.percent_change,
        averageVolume: result.average_volume,
        isMarketOpen: result.is_market_open,
        fiftyTwoWeekLow: result.fifty_two_week?.low,
        fiftyTwoWeekHigh: result.fifty_two_week?.high,
        fiftyTwoWeekLowChange: result.fifty_two_week?.low_change,
        fiftyTwoWeekHighChange: result.fifty_two_week?.high_change,
        fiftyTwoWeekLowChangePercent: result.fifty_two_week?.low_change_percent,
        fiftyTwoWeekHighChangePercent: result.fifty_two_week?.high_change_percent
      },
      message: `**${result.name || ctx.input.symbol}** (${result.symbol || ctx.input.symbol}): ${result.close} ${result.currency || ''} (${result.change >= 0 ? '+' : ''}${result.change}, ${result.percent_change}%)`
    };
  })
  .build();
