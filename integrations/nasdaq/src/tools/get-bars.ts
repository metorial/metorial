import { SlateTool } from 'slates';
import { z } from 'zod';
import { RealtimeClient } from '../lib/realtime-client';
import { spec } from '../spec';

export let getBars = SlateTool.create(spec, {
  name: 'Get Bars',
  key: 'get_bars',
  description: `Get OHLCV (Open, High, Low, Close, Volume) bar data for one or more securities. Supports multiple time intervals from 1-minute to monthly, with up to 10+ years of historical data.
Use this to create charts or analyze price history. Requires OAuth2 authentication with the Real-Time/Delayed REST API.`,
  instructions: [
    'Requires OAuth2 Client Credentials authentication (not API Key).',
    'Use barPrecision to set the interval (e.g., "1day" for daily bars, "5minute" for 5-minute bars).',
    'Use dateRange to specify the lookback period (e.g., "1m" for 1 month, "1y" for 1 year).'
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
        .describe('Time interval for each bar.'),
      dateRange: z
        .enum(['1d', '5d', '1m', '3m', '6m', '1y', '5y', 'max', 'ytd'])
        .optional()
        .describe('Date range for the bar data.'),
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
    if (
      ctx.auth.authMethod !== 'oauth' ||
      !ctx.auth.baseUrl ||
      !ctx.auth.oauthToken ||
      !ctx.auth.tokenEndpoint ||
      !ctx.auth.clientId ||
      !ctx.auth.clientSecret
    ) {
      throw new Error(
        'This tool requires OAuth2 Client Credentials authentication. Please use the OAuth2 authentication method.'
      );
    }

    let client = new RealtimeClient({
      baseUrl: ctx.auth.baseUrl,
      oauthToken: ctx.auth.oauthToken,
      tokenEndpoint: ctx.auth.tokenEndpoint,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      oauthTokenExpiresAt: ctx.auth.oauthTokenExpiresAt || ''
    });

    let result = await client.getBars({
      symbols: ctx.input.symbols,
      barPrecision: ctx.input.barPrecision,
      dateRange: ctx.input.dateRange,
      source: ctx.input.source,
      offset: ctx.input.offset
    });

    let bars = Array.isArray(result) ? result : [result];

    return {
      output: {
        bars
      },
      message: `Retrieved ${ctx.input.barPrecision || 'default'} bar data for **${ctx.input.symbols.join(', ')}** over ${ctx.input.dateRange || 'default'} range.`
    };
  })
  .build();
