import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTechnicalIndicator = SlateTool.create(spec, {
  name: 'Get Technical Indicator',
  key: 'get_technical_indicator',
  description: `Compute a technical indicator for a given symbol. Supports 50+ indicators including SMA, EMA, RSI, MACD, Bollinger Bands, Stochastic, ADX, CCI, ATR, OBV, and many more. Indicators work with equities, forex, and crypto symbols.`,
  instructions: [
    'Common indicator names: SMA, EMA, WMA, DEMA, TEMA, TRIMA, KAMA, T3, RSI, MACD, STOCH, STOCHF, WILLR, ADX, ADXR, CCI, AROON, BBANDS, AD, OBV, ATR, NATR, TRANGE, MOM, ROC, HT_TRENDLINE, HT_SINE, HT_PHASOR.',
    'For MACD, use fastPeriod, slowPeriod, and signalPeriod. For BBANDS, use nbdevup and nbdevdn. For STOCH, use fastKPeriod, slowKPeriod, slowDPeriod.',
    'The maType parameter selects the moving average type: 0=SMA, 1=EMA, 2=WMA, 3=DEMA, 4=TEMA, 5=TRIMA, 6=T3, 7=KAMA, 8=MAMA.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      indicator: z
        .string()
        .describe('Technical indicator function name, e.g. "SMA", "RSI", "MACD", "BBANDS"'),
      symbol: z.string().describe('Ticker symbol, e.g. "AAPL", "EURUSD", "BTC"'),
      interval: z
        .enum(['1min', '5min', '15min', '30min', '60min', 'daily', 'weekly', 'monthly'])
        .describe('Time interval between data points'),
      timePeriod: z
        .number()
        .optional()
        .describe(
          'Number of data points used to calculate the indicator (e.g. 14 for RSI, 20 for SMA)'
        ),
      seriesType: z
        .enum(['close', 'open', 'high', 'low'])
        .optional()
        .describe('Price type to use for calculation'),
      fastPeriod: z
        .number()
        .optional()
        .describe('Fast period for MACD and similar indicators'),
      slowPeriod: z
        .number()
        .optional()
        .describe('Slow period for MACD and similar indicators'),
      signalPeriod: z.number().optional().describe('Signal period for MACD'),
      fastKPeriod: z.number().optional().describe('Fast K period for Stochastic'),
      slowKPeriod: z.number().optional().describe('Slow K period for Stochastic'),
      slowDPeriod: z.number().optional().describe('Slow D period for Stochastic'),
      nbdevup: z
        .number()
        .optional()
        .describe('Standard deviation multiplier for upper Bollinger Band'),
      nbdevdn: z
        .number()
        .optional()
        .describe('Standard deviation multiplier for lower Bollinger Band'),
      maType: z
        .number()
        .optional()
        .describe(
          'Moving average type (0=SMA, 1=EMA, 2=WMA, 3=DEMA, 4=TEMA, 5=TRIMA, 6=T3, 7=KAMA, 8=MAMA)'
        )
    })
  )
  .output(
    z.object({
      indicator: z.string().describe('Indicator name'),
      symbol: z.string().describe('Ticker symbol'),
      interval: z.string().describe('Time interval'),
      dataPoints: z
        .array(
          z.object({
            date: z.string().describe('Date or datetime'),
            values: z
              .record(z.string(), z.string())
              .describe(
                'Indicator values (e.g. {"SMA": "150.25"} or {"MACD": "1.5", "MACD_Signal": "1.2", "MACD_Hist": "0.3"})'
              )
          })
        )
        .describe('Indicator data points, most recent first')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let {
      indicator,
      symbol,
      interval,
      timePeriod,
      seriesType,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      fastKPeriod,
      slowKPeriod,
      slowDPeriod,
      nbdevup,
      nbdevdn,
      maType
    } = ctx.input;

    let data = await client.technicalIndicator({
      indicatorFunction: indicator.toUpperCase(),
      symbol,
      interval,
      timePeriod,
      seriesType,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      fastKPeriod,
      slowKPeriod,
      slowDPeriod,
      nbdevup,
      nbdevdn,
      maType
    });

    let timeSeriesKey = Object.keys(data).find(k => k !== 'Meta Data') || '';
    let timeSeries = data[timeSeriesKey] || {};

    let dataPoints = Object.entries(timeSeries).map(([date, values]: [string, any]) => {
      let stringValues: Record<string, string> = {};
      for (let [key, value] of Object.entries(values)) {
        stringValues[key] = String(value ?? '');
      }
      return { date, values: stringValues };
    });

    return {
      output: { indicator, symbol, interval, dataPoints },
      message: `Computed ${dataPoints.length} data points for **${indicator}** on **${symbol}** (${interval}).`
    };
  })
  .build();
