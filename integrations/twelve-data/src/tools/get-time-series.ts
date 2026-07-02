import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { spec } from '../spec';

let ohlcvSchema = z.object({
  datetime: z.string().describe('Date/time of the data point'),
  open: z.string().describe('Opening price'),
  high: z.string().describe('Highest price'),
  low: z.string().describe('Lowest price'),
  close: z.string().describe('Closing price'),
  volume: z.string().optional().describe('Trading volume')
});

export let getTimeSeries = SlateTool.create(spec, {
  name: 'Get Time Series',
  key: 'get_time_series',
  description: `Retrieve historical OHLCV (Open, High, Low, Close, Volume) time series data for any financial instrument including stocks, forex, crypto, ETFs, and indices.
Supports multiple time intervals from 1-minute to monthly data, with configurable date ranges, output sizes, and timezone settings.
Pre/post market data is available for US equities on intraday intervals.`,
  instructions: [
    'Use the symbol format "AAPL" for stocks, "EUR/USD" for forex, "BTC/USD" for crypto.',
    'For stocks on non-US exchanges, specify the exchange parameter (e.g., exchange: "LSE" for London Stock Exchange).'
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
        .describe('Time interval between data points'),
      exchange: z
        .string()
        .optional()
        .describe('Exchange where the instrument is traded (e.g., "NASDAQ", "NYSE", "LSE")'),
      country: z
        .string()
        .optional()
        .describe('Country of the exchange (e.g., "United States", "United Kingdom")'),
      outputsize: z
        .number()
        .optional()
        .describe('Number of data points to return (default: 30, max: 5000)'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for timestamps (e.g., "America/New_York", "UTC")'),
      startDate: z
        .string()
        .optional()
        .describe('Start date/time in format "YYYY-MM-DD" or "YYYY-MM-DD hh:mm:ss"'),
      endDate: z
        .string()
        .optional()
        .describe('End date/time in format "YYYY-MM-DD" or "YYYY-MM-DD hh:mm:ss"'),
      order: z
        .enum(['ASC', 'DESC'])
        .optional()
        .describe('Sort order of results by datetime (default: DESC)'),
      prepost: z.boolean().optional().describe('Include pre/post market data for US equities')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Ticker symbol'),
      interval: z.string().describe('Time interval used'),
      currency: z.string().optional().describe('Currency of the prices'),
      exchangeTimezone: z.string().optional().describe('Timezone of the exchange'),
      exchange: z.string().optional().describe('Exchange name'),
      type: z.string().optional().describe('Instrument type'),
      values: z.array(ohlcvSchema).describe('Array of OHLCV data points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwelveDataClient(ctx.auth.token);

    let result = await client.getTimeSeries({
      symbol: ctx.input.symbol,
      interval: ctx.input.interval,
      exchange: ctx.input.exchange,
      country: ctx.input.country,
      outputsize: ctx.input.outputsize,
      timezone: ctx.input.timezone,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      order: ctx.input.order,
      prepost: ctx.input.prepost
    });

    let meta = result.meta || {};
    let values = result.values || [];

    return {
      output: {
        symbol: meta.symbol || ctx.input.symbol,
        interval: meta.interval || ctx.input.interval,
        currency: meta.currency,
        exchangeTimezone: meta.exchange_timezone,
        exchange: meta.exchange,
        type: meta.type,
        values: values
      },
      message: `Retrieved ${values.length} data points for **${meta.symbol || ctx.input.symbol}** at **${ctx.input.interval}** interval.`
    };
  })
  .build();
