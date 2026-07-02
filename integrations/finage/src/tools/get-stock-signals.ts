import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
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
    let { symbol, interval } = ctx.input;
    let upperSymbol = symbol.toUpperCase();

    let data = await client.getStockSignals(upperSymbol, interval);

    let output = {
      symbol: upperSymbol,
      interval,
      signal: data.signal,
      confidence: data.confidence,
      currentPrice: data.current_price ?? data.currentPrice ?? data.price,
      indicators: {
        sma20: data.sma_20 ?? data.sma20,
        sma50: data.sma_50 ?? data.sma50,
        rsi: data.rsi,
        macd: data.macd,
        macdSignal: data.macd_signal ?? data.macdSignal,
        macdDiff: data.macd_diff ?? data.macdDiff,
        bollingerHigh: data.bollinger_high ?? data.bollingerHigh,
        bollingerLow: data.bollinger_low ?? data.bollingerLow,
        maCrossover: data.ma_crossover ?? data.maCrossover,
        macdCross: data.macd_cross ?? data.macdCross
      }
    };

    return {
      output,
      message: `**${upperSymbol}** ${interval} signal: **${output.signal ?? 'N/A'}** (confidence: ${output.confidence ?? 'N/A'}%)${output.currentPrice ? `, price: $${output.currentPrice}` : ''}`
    };
  })
  .build();
