import { SlateTool } from 'slates';
import { z } from 'zod';
import { createRealtimeClient, realtimeRecords } from '../lib/realtime-client';
import { spec } from '../spec';

export let getBars = SlateTool.create(spec, {
  name: 'Get Bars',
  key: 'get_bars',
  description: `Get OHLCV (Open, High, Low, Close, Volume) bar data for one or more securities. Supports multiple time intervals from 1-minute to monthly, with up to 10+ years of historical data.
Use this to create charts or analyze price history. Requires OAuth2 authentication with the Real-Time/Delayed REST API.`,
  instructions: [
    'Requires OAuth2 Client Credentials authentication (not API Key).',
    'Use barPrecision to set the interval (e.g., "1day" for daily bars, "5minute" for 5-minute bars).',
    'Use dateRange to specify the lookback period. Supported pairs: 1d with 1minute/5minute; 5d with 5minute/10minute/15minute/30minute; 1m/3m/6m/ytd with 1day; 1y with 1day/1week; 5y/max with 1week/1month.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbols: z
        .array(z.string())
        .describe('List of stock ticker symbols (e.g., ["AAPL", "MSFT"]).'),
      barPrecision: z
        .enum([
          '1minute',
          '5minute',
          '10minute',
          '15minute',
          '30minute',
          '1day',
          '1week',
          '1month'
        ])
        .optional()
        .describe(
          'Time interval for each bar. Defaults to 1day; choose an interval supported for the requested date range.'
        ),
      dateRange: z
        .enum(['1d', '5d', '1m', '3m', '6m', '1y', '5y', 'max', 'ytd'])
        .optional()
        .describe('Date range for the bar data. Defaults to 1m.'),
      source: z.enum(['Nasdaq', 'CQT']).optional().describe('Data source.'),
      offset: z
        .enum(['realtime', 'delayed'])
        .optional()
        .describe('Whether to get real-time or delayed data.')
    })
  )
  .output(
    z.object({
      bars: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of bar data records with OHLCV values.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createRealtimeClient(ctx.auth);

    let result = await client.getBars({
      symbols: ctx.input.symbols,
      barPrecision: ctx.input.barPrecision,
      dateRange: ctx.input.dateRange,
      source: ctx.input.source,
      offset: ctx.input.offset
    });

    let bars = realtimeRecords(result, 'bars');

    return {
      output: {
        bars
      },
      message: `Retrieved ${ctx.input.barPrecision || '1day'} bar data for **${ctx.input.symbols.join(', ')}** over ${ctx.input.dateRange || '1m'} range.`
    };
  })
  .build();
