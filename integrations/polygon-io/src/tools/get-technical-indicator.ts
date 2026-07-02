import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let indicatorValueSchema = z.object({
  timestamp: z.number().optional().describe('Unix millisecond timestamp'),
  value: z.number().optional().describe('Indicator value (for SMA, EMA, RSI)'),
  macdValue: z.number().optional().describe('MACD line value'),
  signal: z.number().optional().describe('Signal line value'),
  histogram: z.number().optional().describe('MACD histogram value')
});

export let getTechnicalIndicator = SlateTool.create(spec, {
  name: 'Get Technical Indicator',
  key: 'get_technical_indicator',
  description: `Calculate technical indicators for a ticker: **SMA** (Simple Moving Average), **EMA** (Exponential Moving Average), **RSI** (Relative Strength Index), or **MACD** (Moving Average Convergence/Divergence).
Configurable by window size, timespan, series type, and date range.`,
  instructions: ['For MACD, use shortWindow, longWindow, and signalWindow instead of window.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Ticker symbol (e.g., "AAPL")'),
      indicator: z
        .enum(['sma', 'ema', 'rsi', 'macd'])
        .describe('Technical indicator to compute'),
      timespan: z
        .enum(['second', 'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'])
        .optional()
        .default('day')
        .describe('Timespan of underlying aggregates'),
      window: z.number().optional().default(14).describe('Window size for SMA, EMA, RSI'),
      shortWindow: z.number().optional().describe('MACD short window (default 12)'),
      longWindow: z.number().optional().describe('MACD long window (default 26)'),
      signalWindow: z.number().optional().describe('MACD signal window (default 9)'),
      seriesType: z
        .enum(['open', 'high', 'low', 'close'])
        .optional()
        .default('close')
        .describe('Price series to use'),
      adjusted: z.boolean().optional().default(true).describe('Whether to adjust for splits'),
      from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)'),
      order: z
        .enum(['asc', 'desc'])
        .optional()
        .default('desc')
        .describe('Sort order by timestamp'),
      limit: z.number().optional().default(50).describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      ticker: z.string().describe('Ticker symbol'),
      indicator: z.string().describe('Indicator type'),
      values: z.array(indicatorValueSchema).describe('Array of computed indicator values'),
      count: z.number().describe('Number of values returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let commonParams = {
      ticker: ctx.input.ticker,
      timespan: ctx.input.timespan,
      adjusted: ctx.input.adjusted,
      seriesType: ctx.input.seriesType,
      order: ctx.input.order,
      limit: ctx.input.limit,
      timestampGte: ctx.input.from,
      timestampLte: ctx.input.to
    };

    let data: any;
    let values: Array<{
      timestamp?: number;
      value?: number;
      macdValue?: number;
      signal?: number;
      histogram?: number;
    }> = [];

    switch (ctx.input.indicator) {
      case 'sma':
        data = await client.getSMA({ ...commonParams, window: ctx.input.window });
        values = (data.results?.values || []).map((v: any) => ({
          timestamp: v.timestamp,
          value: v.value
        }));
        break;

      case 'ema':
        data = await client.getEMA({ ...commonParams, window: ctx.input.window });
        values = (data.results?.values || []).map((v: any) => ({
          timestamp: v.timestamp,
          value: v.value
        }));
        break;

      case 'rsi':
        data = await client.getRSI({ ...commonParams, window: ctx.input.window });
        values = (data.results?.values || []).map((v: any) => ({
          timestamp: v.timestamp,
          value: v.value
        }));
        break;

      case 'macd':
        data = await client.getMACD({
          ...commonParams,
          shortWindow: ctx.input.shortWindow,
          longWindow: ctx.input.longWindow,
          signalWindow: ctx.input.signalWindow
        });
        values = (data.results?.values || []).map((v: any) => ({
          timestamp: v.timestamp,
          macdValue: v.value,
          signal: v.signal,
          histogram: v.histogram
        }));
        break;
    }

    return {
      output: {
        ticker: ctx.input.ticker,
        indicator: ctx.input.indicator.toUpperCase(),
        values,
        count: values.length
      },
      message: `Computed **${ctx.input.indicator.toUpperCase()}** for **${ctx.input.ticker}** — ${values.length} data points returned.`
    };
  })
  .build();
