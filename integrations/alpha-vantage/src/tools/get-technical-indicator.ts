import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseRecord, responseSeries, responseText, validateMonth } from '../lib/response';
import { requiredIndicatorInputs } from '../lib/technical';
import { spec } from '../spec';

export let getTechnicalIndicator = SlateTool.create(spec, {
  name: 'Get Technical Indicator',
  key: 'get_technical_indicator',
  description: `Compute a technical indicator for a given symbol. Supports 50+ indicators including SMA, EMA, RSI, MACD, Bollinger Bands, Stochastic, ADX, CCI, ATR, OBV, and many more. Indicators work with equities, forex, and crypto symbols.`,
  instructions: [
    'Common indicator names: SMA, EMA, WMA, DEMA, TEMA, TRIMA, KAMA, T3, RSI, MACD, STOCH, STOCHF, WILLR, ADX, ADXR, CCI, AROON, BBANDS, AD, OBV, ATR, NATR, TRANGE, MOM, ROC, HT_TRENDLINE, HT_SINE, HT_PHASOR.',
    'For MACD, use fastPeriod, slowPeriod, and signalPeriod. For BBANDS, use nbdevup and nbdevdn. For STOCH, use fastKPeriod, slowKPeriod, slowDPeriod.',
    'For timePeriod/seriesType, supply the parameters required by the selected indicator. MACD and VWAP require premium access. The maType parameter selects the moving average type: 0=SMA, 1=EMA, 2=WMA, 3=DEMA, 4=TEMA, 5=TRIMA, 6=T3, 7=KAMA, 8=MAMA.'
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
      fastMaType: z
        .number()
        .optional()
        .describe('MACDEXT fast moving average type, whole number 0-8'),
      slowMaType: z
        .number()
        .optional()
        .describe('MACDEXT slow moving average type, whole number 0-8'),
      signalMaType: z
        .number()
        .optional()
        .describe('MACDEXT signal moving average type, whole number 0-8'),
      slowKMaType: z
        .number()
        .optional()
        .describe('STOCH slow K moving average type, whole number 0-8'),
      slowDMaType: z
        .number()
        .optional()
        .describe('STOCH slow D moving average type, whole number 0-8'),
      fastDPeriod: z
        .number()
        .optional()
        .describe('STOCHF/STOCHRSI fast D period, positive whole number'),
      fastDMaType: z
        .number()
        .optional()
        .describe('STOCHF/STOCHRSI fast D moving average type, whole number 0-8'),
      timePeriod1: z
        .number()
        .optional()
        .describe('ULTOSC first period, positive whole number'),
      timePeriod2: z
        .number()
        .optional()
        .describe('ULTOSC second period, positive whole number'),
      timePeriod3: z
        .number()
        .optional()
        .describe('ULTOSC third period, positive whole number'),
      acceleration: z.number().optional().describe('SAR acceleration, positive decimal'),
      maximum: z.number().optional().describe('SAR maximum acceleration, positive decimal'),
      fastLimit: z.number().optional().describe('MAMA fast limit, positive decimal'),
      slowLimit: z.number().optional().describe('MAMA slow limit, positive decimal'),
      month: z.string().optional().describe('Historical month in YYYY-MM format'),
      entitlement: z
        .enum(['realtime', 'delayed'])
        .optional()
        .describe('US market data freshness, subject to premium entitlement'),
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
    let normalizedIndicator = ctx.input.indicator.trim().toUpperCase();
    for (let field of requiredIndicatorInputs[normalizedIndicator] ?? []) {
      if (ctx.input[field as 'timePeriod' | 'seriesType'] === undefined)
        throw createApiServiceError(`${field} is required for ${normalizedIndicator}.`);
    }
    for (let [field, value] of Object.entries(ctx.input)) {
      if (typeof value !== 'number') continue;
      let isMaType = field.toLowerCase().endsWith('matype');
      let isPeriod =
        field.toLowerCase().includes('period') || field === 'nbdevup' || field === 'nbdevdn';
      if (
        !Number.isFinite(value) ||
        (isMaType
          ? !Number.isInteger(value) || value < 0 || value > 8
          : value <= 0 || (isPeriod && !Number.isInteger(value)))
      ) {
        throw createApiServiceError(
          `${field} must be ${isMaType ? 'a whole number from 0 to 8' : isPeriod ? 'a positive whole number' : 'a positive number'}.`
        );
      }
    }
    validateMonth(ctx.input.month);
    if (
      normalizedIndicator === 'VWAP' &&
      ['daily', 'weekly', 'monthly'].includes(ctx.input.interval)
    )
      throw createApiServiceError('VWAP supports intraday intervals only.');
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
      indicatorFunction: normalizedIndicator,
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
      maType,
      fastMaType: ctx.input.fastMaType,
      slowMaType: ctx.input.slowMaType,
      signalMaType: ctx.input.signalMaType,
      slowKMaType: ctx.input.slowKMaType,
      slowDMaType: ctx.input.slowDMaType,
      fastDPeriod: ctx.input.fastDPeriod,
      fastDMaType: ctx.input.fastDMaType,
      timePeriod1: ctx.input.timePeriod1,
      timePeriod2: ctx.input.timePeriod2,
      timePeriod3: ctx.input.timePeriod3,
      acceleration: ctx.input.acceleration,
      maximum: ctx.input.maximum,
      fastLimit: ctx.input.fastLimit,
      slowLimit: ctx.input.slowLimit,
      month: ctx.input.month,
      entitlement: ctx.input.entitlement
    });

    let timeSeries = responseSeries(data);

    let dataPoints = Object.entries(timeSeries).map(([date, values]: [string, any]) => {
      let stringValues: Record<string, string> = {};
      for (let [key, value] of Object.entries(responseRecord(values, 'indicator values'))) {
        stringValues[key] = responseText(value, key);
      }
      return { date, values: stringValues };
    });

    return {
      output: { indicator, symbol, interval, dataPoints },
      message: `Computed ${dataPoints.length} data points for **${indicator}** on **${symbol}** (${interval}).`
    };
  })
  .build();
