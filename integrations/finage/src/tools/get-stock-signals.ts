import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { finageNumber, finageRecord, finageString, finageSymbol } from '../lib/response';
import { spec } from '../spec';

export let getStockSignals = SlateTool.create(spec, {
  name: 'Get Stock Trading Signals',
  key: 'get_stock_signals',
  description: `Retrieve combined technical analysis signals for a US stock. Returns SMA, RSI, MACD, Bollinger Bands, and an overall signal (buy/sell/hold) with confidence score. Available in daily and weekly intervals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('US stock ticker symbol (e.g. "AAPL")'),
      interval: z.enum(['daily', 'weekly']).default('daily').describe('Signal interval')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Original provider response'),
      symbol: z.string().describe('Stock ticker symbol'),
      interval: z.string().describe('Signal interval'),
      signal: z.string().optional().describe('Overall signal (buy/sell/hold)'),
      confidence: z.number().optional().describe('Confidence score (0-100)'),
      currentPrice: z.number().optional().describe('Current price'),
      indicators: z
        .object({
          sma20: z.number().optional().describe('20-period SMA'),
          sma50: z.number().optional().describe('50-period SMA'),
          rsi: z.number().optional().describe('Relative Strength Index'),
          macd: z.number().optional().describe('MACD value'),
          macdSignal: z.number().optional().describe('MACD signal line'),
          macdDiff: z.number().optional().describe('MACD histogram'),
          bollingerHigh: z.number().optional().describe('Upper Bollinger Band'),
          bollingerLow: z.number().optional().describe('Lower Bollinger Band'),
          maCrossover: z.string().optional().describe('MA crossover status'),
          macdCross: z.string().optional().describe('MACD crossover status')
        })
        .optional()
        .describe('Individual indicator values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let { interval } = ctx.input;
    let symbol = finageSymbol(ctx.input.symbol);
    let data = await client.getStockSignals(symbol, interval);
    let response = finageRecord(data);
    let indicators =
      response.indicators == null ? response : finageRecord(response.indicators, 'indicators');
    let confidence = finageNumber(response.confidence);
    if (confidence !== undefined && (confidence < 0 || confidence > 1))
      throw createApiServiceError(
        'Finage returned a confidence score outside its documented 0 to 1 range.'
      );
    if (!finageString(response.signal))
      throw createApiServiceError('Finage returned no trading signal.');
    let crossover = (value: unknown) =>
      typeof value === 'boolean' ? String(value) : finageString(value);
    let output = pickDefined({
      symbol,
      interval,
      signal: finageString(response.signal),
      confidence: confidence === undefined ? undefined : confidence * 100,
      currentPrice: finageNumber(
        response.current_price ?? response.currentPrice ?? response.price
      ),
      indicators: pickDefined({
        sma20: finageNumber(indicators.sma_20 ?? indicators.sma20),
        sma50: finageNumber(indicators.sma_50 ?? indicators.sma50),
        rsi: finageNumber(indicators.rsi),
        macd: finageNumber(indicators.macd),
        macdSignal: finageNumber(indicators.macd_signal ?? indicators.macdSignal),
        macdDiff: finageNumber(indicators.macd_diff ?? indicators.macdDiff),
        bollingerHigh: finageNumber(indicators.bollinger_high ?? indicators.bollingerHigh),
        bollingerLow: finageNumber(indicators.bollinger_low ?? indicators.bollingerLow),
        maCrossover: crossover(indicators.ma_crossover ?? indicators.maCrossover),
        macdCross: crossover(indicators.macd_cross ?? indicators.macdCross)
      }),
      raw: data
    });
    return {
      output: { ...output, symbol, interval },
      message: `Retrieved **${symbol}** ${interval} trading signals.`
    };
  })
  .build();
