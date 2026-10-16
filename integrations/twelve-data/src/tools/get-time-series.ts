import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { optionalString, record, records, requiredString } from '../lib/response';
import { spec } from '../spec';

let ohlcvSchema = z.object({
  datetime: z
    .string()
    .describe(
      'Provider bar opening date/time; interpret using the requested intraday timezone and provider exchange metadata'
    ),
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
Pre/post market data requires Pro (individual) or Venture (business) or higher, and is limited to US equities at 1min, 5min, 15min, or 30min intervals; volume is not supplied.`,
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
        .describe(
          'IANA timezone, UTC, or Exchange for intraday output; ignored for daily, weekly, and monthly intervals, which use exchange local time'
        ),
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
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete provider response, preserving unavailable values and metadata'),
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

    let meta = record(result.meta, 'meta');
    let values = records(result.values, 'values').map(value => ({
      ...value,
      datetime: requiredString(value.datetime, 'values.datetime'),
      open: requiredString(value.open, 'values.open'),
      high: requiredString(value.high, 'values.high'),
      low: requiredString(value.low, 'values.low'),
      close: requiredString(value.close, 'values.close'),
      volume: optionalString(value.volume)
    }));

    return {
      output: {
        raw: result,
        symbol: requiredString(meta.symbol, 'meta.symbol'),
        interval: requiredString(meta.interval, 'meta.interval'),
        currency: optionalString(meta.currency),
        exchangeTimezone: optionalString(meta.exchange_timezone),
        exchange: optionalString(meta.exchange),
        type: optionalString(meta.type),
        values: values
      },
      message: `Retrieved ${values.length} data points for **${meta.symbol}** at **${ctx.input.interval}** interval.`
    };
  })
  .build();
