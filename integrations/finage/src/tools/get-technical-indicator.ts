import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import {
  finageNumber,
  finageRecords,
  finageString,
  finageSymbol,
  validateFinageLimit
} from '../lib/response';
import { spec } from '../spec';

export let getTechnicalIndicator = SlateTool.create(spec, {
  name: 'Get Technical Indicator',
  key: 'get_technical_indicator',
  description: `Retrieve technical indicators for a stock symbol. Supports SMA, EMA, DEMA, TEMA, WMA, RSI, Williams, ADX and more. Returns OHLCV data alongside the computed indicator values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Stock ticker symbol (e.g. "AAPL")'),
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
      raw: z.unknown().optional().describe('Original provider response'),
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
    let { indicatorType, timespan, period } = ctx.input;
    let symbol = finageSymbol(ctx.input.symbol);
    validateFinageLimit(period, 'Period');
    if (timespan === 'weekly' || timespan === 'monthly') {
      throw createApiServiceError(
        'Finage technical indicators support daily and intraday intervals. Choose daily, 1min, 5min, 15min, 30min, 1hour, or 4hour.'
      );
    }
    let data = await client.getTechnicalIndicator({ indicatorType, timespan, symbol, period });
    let dataPoints = finageRecords(data, ['results', 'values']).map(p =>
      pickDefined({
        date: finageString(p.date),
        open: finageNumber(p.open ?? p.o),
        high: finageNumber(p.high ?? p.h),
        low: finageNumber(p.low ?? p.l),
        close: finageNumber(p.close ?? p.c),
        volume: finageNumber(p.volume ?? p.v),
        indicatorValue: finageNumber(p.value ?? p[indicatorType.toLowerCase()])
      })
    );
    return {
      output: { symbol, indicatorType, dataPoints, raw: data },
      message: `Retrieved **${dataPoints.length}** ${indicatorType} data points for **${symbol}** (${timespan}).`
    };
  })
  .build();
