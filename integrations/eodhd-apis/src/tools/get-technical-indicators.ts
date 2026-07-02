import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

export let getTechnicalIndicators = SlateTool.create(spec, {
  name: 'Get Technical Indicators',
  key: 'get_technical_indicators',
  description: `Compute technical analysis indicators for any ticker directly from the API. Supports 20+ indicators including SMA, EMA, RSI, MACD, Bollinger Bands, Stochastic, ATR, CCI, ADX, and more.
Returns time-series data with the indicator values alongside date.`,
  instructions: [
    'Available functions: sma, ema, wma, rsi, macd, bbands, stochastic, stochrsi, atr, cci, adx, dmi, sar, slope, stddev, volatility, avgvol, avgvolccy, beta, splitadjusted',
    'Period range: 2 to 100000 (default: 50)'
  ],
  constraints: ['Each request consumes 5 API calls'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Ticker symbol with exchange, e.g., AAPL.US'),
      function: z
        .enum([
          'sma',
          'ema',
          'wma',
          'rsi',
          'macd',
          'bbands',
          'stochastic',
          'stochrsi',
          'atr',
          'cci',
          'adx',
          'dmi',
          'sar',
          'slope',
          'stddev',
          'volatility',
          'avgvol',
          'avgvolccy',
          'beta',
          'splitadjusted'
        ])
        .describe('Technical indicator function to compute'),
      period: z.number().optional().describe('Lookback period (2-100000, default: 50)'),
      from: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      to: z.string().optional().describe('End date in YYYY-MM-DD format'),
      order: z.enum(['a', 'd']).optional().describe('Sort order: a=ascending, d=descending')
    })
  )
  .output(
    z.object({
      ticker: z.string().describe('Requested ticker symbol'),
      function: z.string().describe('Indicator function used'),
      period: z.number().describe('Lookback period used'),
      values: z.array(z.any()).describe('Time-series indicator values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });

    let values = await client.getTechnicalIndicator(ctx.input.ticker, {
      function: ctx.input.function,
      period: ctx.input.period,
      from: ctx.input.from,
      to: ctx.input.to,
      order: ctx.input.order
    });

    let valuesArray = Array.isArray(values) ? values : [];

    return {
      output: {
        ticker: ctx.input.ticker,
        function: ctx.input.function,
        period: ctx.input.period ?? 50,
        values: valuesArray
      },
      message: `Computed **${ctx.input.function.toUpperCase()}** (period: ${ctx.input.period ?? 50}) for **${ctx.input.ticker}** with **${valuesArray.length}** data points.`
    };
  })
  .build();
