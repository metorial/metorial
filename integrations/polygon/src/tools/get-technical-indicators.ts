import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let getTechnicalIndicators = SlateTool.create(spec, {
  name: 'Get Technical Indicators',
  key: 'get_technical_indicators',
  description: `Retrieve pre-computed technical indicators (SMA, EMA, RSI, MACD) for any ticker (stocks, forex, crypto, indices). Configurable window size, timespan, and price series type. MACD additionally supports short, long, and signal window customization.`,
  instructions: [
    'For MACD, the default windows are short=12, long=26, signal=9.',
    'For SMA/EMA/RSI, the default window is typically 50 or 14 depending on the indicator.',
    'Use the seriesType parameter to choose which price to use (open, close, high, low).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Ticker symbol (e.g., AAPL, C:EURUSD, X:BTCUSD, I:SPX)'),
      indicator: z
        .enum(['sma', 'ema', 'rsi', 'macd'])
        .describe('Technical indicator to compute'),
      timespan: z
        .enum(['second', 'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'])
        .optional()
        .describe('Aggregate timespan. Defaults to day.'),
      window: z
        .number()
        .int()
        .optional()
        .describe('Window size for SMA/EMA/RSI (e.g., 14 for RSI, 50 for SMA)'),
      shortWindow: z
        .number()
        .int()
        .optional()
        .describe('MACD short-period EMA window (default 12)'),
      longWindow: z
        .number()
        .int()
        .optional()
        .describe('MACD long-period EMA window (default 26)'),
      signalWindow: z
        .number()
        .int()
        .optional()
        .describe('MACD signal line EMA window (default 9)'),
      seriesType: z
        .enum(['open', 'close', 'high', 'low'])
        .optional()
        .describe('Price series to use. Defaults to close.'),
      adjusted: z
        .boolean()
        .optional()
        .describe('Whether aggregates are adjusted for splits. Defaults to true.'),
      timestampFrom: z
        .string()
        .optional()
        .describe('Start timestamp filter (YYYY-MM-DD or Unix ms)'),
      timestampTo: z
        .string()
        .optional()
        .describe('End timestamp filter (YYYY-MM-DD or Unix ms)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order. Defaults to desc.'),
      limit: z.number().int().optional().describe('Max results (max 5000)')
    })
  )
  .output(
    z.object({
      ticker: z.string().optional().describe('Ticker symbol'),
      indicator: z.string().describe('Indicator name'),
      values: z
        .array(
          z.object({
            timestamp: z.number().optional().describe('Unix millisecond timestamp'),
            value: z
              .number()
              .optional()
              .describe('Indicator value (SMA/EMA/RSI value, or MACD line value)'),
            signal: z.number().optional().describe('MACD signal line value'),
            histogram: z.number().optional().describe('MACD histogram value')
          })
        )
        .describe('Indicator data points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    let commonParams = {
      ticker: ctx.input.ticker,
      timespan: ctx.input.timespan,
      adjusted: ctx.input.adjusted,
      seriesType: ctx.input.seriesType,
      order: ctx.input.order,
      limit: ctx.input.limit,
      timestampGte: ctx.input.timestampFrom,
      timestampLte: ctx.input.timestampTo
    };

    let response: any;

    if (ctx.input.indicator === 'sma') {
      response = await client.getSMA({ ...commonParams, window: ctx.input.window });
    } else if (ctx.input.indicator === 'ema') {
      response = await client.getEMA({ ...commonParams, window: ctx.input.window });
    } else if (ctx.input.indicator === 'rsi') {
      response = await client.getRSI({ ...commonParams, window: ctx.input.window });
    } else {
      response = await client.getMACD({
        ...commonParams,
        shortWindow: ctx.input.shortWindow,
        longWindow: ctx.input.longWindow,
        signalWindow: ctx.input.signalWindow
      });
    }

    let results = response.results?.values || [];
    let values = results.map((v: any) => ({
      timestamp: v.timestamp,
      value: v.value,
      signal: v.signal,
      histogram: v.histogram
    }));

    return {
      output: {
        ticker: ctx.input.ticker,
        indicator: ctx.input.indicator.toUpperCase(),
        values
      },
      message: `Retrieved **${values.length}** ${ctx.input.indicator.toUpperCase()} data points for **${ctx.input.ticker}**.`
    };
  })
  .build();
