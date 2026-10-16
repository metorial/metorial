import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseRecord, responseSeries, responseText, validateMonth } from '../lib/response';
import { spec } from '../spec';

let ohlcvSchema = z.object({
  date: z.string().describe('Date or datetime of the data point'),
  open: z.string().describe('Opening price'),
  high: z.string().describe('Highest price'),
  low: z.string().describe('Lowest price'),
  close: z.string().describe('Closing price'),
  volume: z.string().describe('Trading volume'),
  adjustedClose: z.string().optional().describe('Split/dividend-adjusted close when returned'),
  dividendAmount: z.string().optional().describe('Dividend amount when returned'),
  splitCoefficient: z.string().optional().describe('Split coefficient when returned')
});

export let getStockPrice = SlateTool.create(spec, {
  name: 'Get Stock Price',
  key: 'get_stock_price',
  description: `Retrieve historical stock price data (OHLCV) for a given ticker symbol at various time resolutions. Supports intraday (1/5/15/30/60 min), daily, weekly, and monthly intervals. Adjusted daily, weekly, and monthly endpoints return raw OHLCV plus a separate adjusted close; intraday adjustment applies to OHLCV. Use this to analyze price history, build charts, or feed into further analysis.`,
  constraints: [
    'Intraday and daily adjusted data require premium access. Raw daily compact data is available with a free key; full daily history and realtime/delayed entitlements require premium access. Weekly and monthly endpoints return their available history.'
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
      extendedHours: z
        .boolean()
        .optional()
        .describe('Include extended hours for intraday data; provider default is true'),
      entitlement: z
        .enum(['realtime', 'delayed'])
        .optional()
        .describe('US market data freshness; requires the corresponding premium entitlement'),
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

    validateMonth(month);
    if (month !== undefined && resolution !== 'intraday')
      throw createApiServiceError('month applies only to intraday stock data.');
    if (ctx.input.extendedHours !== undefined && resolution !== 'intraday')
      throw createApiServiceError('extendedHours applies only to intraday stock data.');
    if (
      ctx.input.entitlement !== undefined &&
      resolution !== 'intraday' &&
      !(resolution === 'daily' && adjusted)
    )
      throw createApiServiceError(
        'entitlement applies to intraday or adjusted daily stock data.'
      );
    let data: any;

    if (resolution === 'intraday') {
      if (!interval) {
        throw createApiServiceError(
          'Interval is required for intraday resolution. Choose one of: 1min, 5min, 15min, 30min, 60min.'
        );
      }
      data = await client.timeSeriesIntraday({
        symbol,
        interval,
        adjusted,
        outputSize,
        month,
        extendedHours: ctx.input.extendedHours,
        entitlement: ctx.input.entitlement
      });
    } else if (resolution === 'daily') {
      if (adjusted) {
        data = await client.timeSeriesDailyAdjusted({
          symbol,
          outputSize,
          entitlement: ctx.input.entitlement
        });
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

    let metaData = responseRecord(data['Meta Data'], 'metadata');
    let lastRefreshed = responseText(metaData['3. Last Refreshed'], ' Last Refreshed');
    let timeZone = responseText(
      metaData['6. Time Zone'] ?? metaData['5. Time Zone'] ?? metaData['4. Time Zone'],
      ' Time Zone'
    );

    // Find the time series key (varies by endpoint)
    let timeSeries = responseSeries(data);

    let prices = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      date,
      open: responseText(values['1. open'], ' open'),
      high: responseText(values['2. high'], ' high'),
      low: responseText(values['3. low'], ' low'),
      close: responseText(values['4. close'] ?? values['5. adjusted close'], ' close'),
      volume: responseText(values['5. volume'] ?? values['6. volume'], 'volume'),
      adjustedClose:
        values['5. adjusted close'] === undefined
          ? undefined
          : responseText(values['5. adjusted close'], 'adjusted close'),
      dividendAmount:
        (values['7. dividend amount'] ?? values['8. dividend amount']) === undefined
          ? undefined
          : responseText(
              values['7. dividend amount'] ?? values['8. dividend amount'],
              'dividend amount'
            ),
      splitCoefficient:
        values['8. split coefficient'] === undefined
          ? undefined
          : responseText(values['8. split coefficient'], 'split coefficient')
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
