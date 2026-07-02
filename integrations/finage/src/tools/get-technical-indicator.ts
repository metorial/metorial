import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { spec } from '../spec';

export let getTechnicalIndicator = SlateTool.create(spec, {
  name: 'Get Technical Indicator',
  key: 'get_technical_indicator',
  description: `Calculate technical indicators for a stock or forex symbol. Supports SMA, EMA, DEMA, TEMA, WMA, RSI, Williams, ADX and more. Returns OHLCV data alongside the computed indicator values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Ticker symbol (e.g. "AAPL", "EURUSD")'),
      indicatorType: z
        .enum(['SMA', 'EMA', 'DEMA', 'TEMA', 'WMA', 'RSI', 'WILLIAMS', 'ADX'])
        .describe('Technical indicator to calculate'),
      timespan: z
        .enum([
          '1min',
          '5min',
          '15min',
          '30min',
          '1hour',
          '4hour',
          'daily',
          'weekly',
          'monthly'
        ])
        .default('daily')
        .describe('Time period for calculation'),
      period: z
        .number()
        .optional()
        .describe('Lookback period for the indicator (e.g. 14 for RSI, 20 for SMA)')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Ticker symbol'),
      indicatorType: z.string().describe('Indicator type'),
      dataPoints: z
        .array(
          z.object({
            date: z.string().optional().describe('Date'),
            open: z.number().optional().describe('Open price'),
            high: z.number().optional().describe('High price'),
            low: z.number().optional().describe('Low price'),
            close: z.number().optional().describe('Close price'),
            volume: z.number().optional().describe('Volume'),
            indicatorValue: z.number().optional().describe('Computed indicator value')
          })
        )
        .describe('Data points with indicator values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let { symbol, indicatorType, timespan, period } = ctx.input;

    let data = await client.getTechnicalIndicator({
      indicatorType,
      timespan,
      symbol: symbol.toUpperCase(),
      period
    });

    let rawPoints = Array.isArray(data) ? data : data?.results || data?.values || [];
    let dataPoints = rawPoints.map((p: any) => ({
      date: p.date ?? p.t,
      open: p.open ?? p.o,
      high: p.high ?? p.h,
      low: p.low ?? p.l,
      close: p.close ?? p.c,
      volume: p.volume ?? p.v,
      indicatorValue: p.value ?? p[indicatorType.toLowerCase()]
    }));

    return {
      output: {
        symbol: symbol.toUpperCase(),
        indicatorType,
        dataPoints
      },
      message: `Retrieved **${dataPoints.length}** ${indicatorType} data points for **${symbol.toUpperCase()}** (${timespan}).`
    };
  })
  .build();
