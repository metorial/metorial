import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ohlcvSchema = z.object({
  date: z.string().describe('Date or datetime of the data point'),
  open: z.string().describe('Opening price'),
  high: z.string().describe('Highest price'),
  low: z.string().describe('Lowest price'),
  close: z.string().describe('Closing price'),
  volume: z.string().describe('Trading volume')
});

export let getStockPrice = SlateTool.create(spec, {
  name: 'Get Stock Price',
  key: 'get_stock_price',
  description: `Retrieve historical stock price data (OHLCV) for a given ticker symbol at various time resolutions. Supports intraday (1/5/15/30/60 min), daily, weekly, and monthly intervals. Returns split/dividend-adjusted data when available. Use this to analyze price history, build charts, or feed into further analysis.`,
  constraints: [
    'Free API keys are limited to 25 requests per day and return compact data (latest 100 data points). Full historical data (20+ years) requires a premium key.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Stock ticker symbol, e.g. "AAPL", "MSFT", "TSLA"'),
      resolution: z
        .enum(['intraday', 'daily', 'weekly', 'monthly'])
        .describe('Time resolution for the price data'),
      interval: z
        .enum(['1min', '5min', '15min', '30min', '60min'])
        .optional()
        .describe('Interval for intraday data. Required when resolution is "intraday".'),
      adjusted: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to return split/dividend-adjusted data'),
      outputSize: z
        .enum(['compact', 'full'])
        .optional()
        .default('compact')
        .describe(
          '"compact" returns the latest 100 data points; "full" returns up to 20+ years of data'
        ),
      month: z
        .string()
        .optional()
        .describe('Filter intraday data to a specific month in YYYY-MM format, e.g. "2024-01"')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Ticker symbol'),
      resolution: z.string().describe('Time resolution used'),
      lastRefreshed: z.string().describe('Timestamp of the most recent data point'),
      timeZone: z.string().optional().describe('Timezone of the data'),
      prices: z
        .array(ohlcvSchema)
        .describe('Array of OHLCV price data points, most recent first')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { symbol, resolution, interval, adjusted, outputSize, month } = ctx.input;

    let data: any;

    if (resolution === 'intraday') {
      if (!interval) {
        throw new Error(
          'Interval is required for intraday resolution. Choose one of: 1min, 5min, 15min, 30min, 60min.'
        );
      }
      data = await client.timeSeriesIntraday({
        symbol,
        interval,
        adjusted,
        outputSize,
        month
      });
    } else if (resolution === 'daily') {
      if (adjusted) {
        data = await client.timeSeriesDailyAdjusted({ symbol, outputSize });
      } else {
        data = await client.timeSeriesDaily({ symbol, outputSize });
      }
    } else if (resolution === 'weekly') {
      if (adjusted) {
        data = await client.timeSeriesWeeklyAdjusted({ symbol });
      } else {
        data = await client.timeSeriesWeekly({ symbol });
      }
    } else if (adjusted) {
      data = await client.timeSeriesMonthlyAdjusted({ symbol });
    } else {
      data = await client.timeSeriesMonthly({ symbol });
    }

    let metaData = data['Meta Data'] || {};
    let lastRefreshed = metaData['3. Last Refreshed'] || '';
    let timeZone =
      metaData['6. Time Zone'] || metaData['5. Time Zone'] || metaData['4. Time Zone'] || '';

    // Find the time series key (varies by endpoint)
    let timeSeriesKey = Object.keys(data).find(k => k !== 'Meta Data') || '';
    let timeSeries = data[timeSeriesKey] || {};

    let prices = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: values['1. open'] || '',
      high: values['2. high'] || '',
      low: values['3. low'] || '',
      close: values['4. close'] || values['5. adjusted close'] || '',
      volume: values['5. volume'] || values['6. volume'] || ''
    }));

    return {
      output: {
        symbol,
        resolution,
        lastRefreshed,
        timeZone,
        prices
      },
      message: `Retrieved ${prices.length} ${resolution} price data points for **${symbol}**.`
    };
  })
  .build();
