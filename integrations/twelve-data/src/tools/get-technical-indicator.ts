import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { spec } from '../spec';

export let getTechnicalIndicator = SlateTool.create(spec, {
  name: 'Get Technical Indicator',
  key: 'get_technical_indicator',
  description: `Calculate and retrieve technical indicator values for any financial instrument. Supports 100+ indicators including SMA, EMA, RSI, MACD, Bollinger Bands, Stochastic, ADX, ATR, and many more.
Each indicator can be configured with specific parameters such as time period, series type, and moving average type.`,
  instructions: [
    'The indicator name must match the Twelve Data endpoint name (lowercase), e.g., "sma", "ema", "rsi", "macd", "bbands", "stoch", "adx", "atr".',
    'Common indicators: sma, ema, wma, rsi, macd, bbands, stoch, adx, atr, cci, obv, vwap, willr, aroon, ichimoku.',
    'The timePeriod parameter is used by most indicators (default varies by indicator, typically 14).'
  ],
  constraints: [
    'Indicator names must be valid Twelve Data technical indicator endpoint names.'
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
        .describe('Time interval for the indicator calculation'),
      indicator: z
        .string()
        .describe(
          'Technical indicator name (e.g., "sma", "ema", "rsi", "macd", "bbands", "stoch")'
        ),
      exchange: z.string().optional().describe('Exchange where the instrument is traded'),
      country: z.string().optional().describe('Country of the exchange'),
      outputsize: z
        .number()
        .optional()
        .describe('Number of data points to return (default: 30)'),
      timezone: z.string().optional().describe('Timezone for timestamps'),
      startDate: z
        .string()
        .optional()
        .describe('Start date (YYYY-MM-DD or YYYY-MM-DD hh:mm:ss)'),
      endDate: z.string().optional().describe('End date (YYYY-MM-DD or YYYY-MM-DD hh:mm:ss)'),
      timePeriod: z
        .number()
        .optional()
        .describe('Number of periods for the indicator calculation'),
      seriesType: z
        .enum(['open', 'high', 'low', 'close'])
        .optional()
        .describe('Price series to use for calculation (default: "close")'),
      fastPeriod: z.number().optional().describe('Fast period for indicators like MACD'),
      slowPeriod: z.number().optional().describe('Slow period for indicators like MACD'),
      signalPeriod: z.number().optional().describe('Signal period for indicators like MACD'),
      fastKPeriod: z.number().optional().describe('Fast K period for Stochastic'),
      slowKPeriod: z.number().optional().describe('Slow K period for Stochastic'),
      slowDPeriod: z.number().optional().describe('Slow D period for Stochastic'),
      sd: z.number().optional().describe('Standard deviation multiplier for Bollinger Bands')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Ticker symbol'),
      interval: z.string().describe('Time interval'),
      indicator: z.string().describe('Indicator name'),
      values: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of indicator values with timestamps')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwelveDataClient(ctx.auth.token);

    let result = await client.getTechnicalIndicator({
      symbol: ctx.input.symbol,
      interval: ctx.input.interval,
      indicator: ctx.input.indicator,
      exchange: ctx.input.exchange,
      country: ctx.input.country,
      outputsize: ctx.input.outputsize,
      timezone: ctx.input.timezone,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      timePeriod: ctx.input.timePeriod,
      seriesType: ctx.input.seriesType,
      fastPeriod: ctx.input.fastPeriod,
      slowPeriod: ctx.input.slowPeriod,
      signalPeriod: ctx.input.signalPeriod,
      fastKPeriod: ctx.input.fastKPeriod,
      slowKPeriod: ctx.input.slowKPeriod,
      slowDPeriod: ctx.input.slowDPeriod,
      sd: ctx.input.sd
    });

    let meta = result.meta || {};
    let values = result.values || [];

    return {
      output: {
        symbol: meta.symbol || ctx.input.symbol,
        interval: meta.interval || ctx.input.interval,
        indicator: ctx.input.indicator,
        values
      },
      message: `Calculated **${ctx.input.indicator.toUpperCase()}** for **${ctx.input.symbol}** (${ctx.input.interval}): ${values.length} data points.`
    };
  })
  .build();
