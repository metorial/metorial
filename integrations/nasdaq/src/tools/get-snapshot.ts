import { SlateTool } from 'slates';
import { z } from 'zod';
import { RealtimeClient } from '../lib/realtime-client';
import { spec } from '../spec';

export let getSnapshot = SlateTool.create(spec, {
  name: 'Get Snapshot',
  key: 'get_snapshot',
  description: `Get a comprehensive market snapshot for one or more securities, including open, high, low, close, volume, net change, and previous close. Also supports retrieving top market trends (gainers/decliners).
Requires OAuth2 authentication with the Real-Time/Delayed REST API.`,
  instructions: [
    'Requires OAuth2 Client Credentials authentication (not API Key).',
    'Set includeTrends to true to also fetch top 5 gainers and decliners.'
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
      source: z
        .enum(['Nasdaq', 'BX', 'PSX', 'CQT'])
        .optional()
        .describe('Data source exchange.'),
      offset: z
        .enum(['realtime', 'delayed'])
        .optional()
        .describe('Whether to get real-time or delayed data.'),
      includeTrends: z.boolean().optional().describe('Also fetch top 5 gainers and decliners.')
    })
  )
  .output(
    z.object({
      snapshots: z
        .array(z.record(z.string(), z.any()))
        .describe('Snapshot data for each requested symbol.'),
      trends: z
        .record(z.string(), z.any())
        .optional()
        .describe('Top gainers and decliners (if includeTrends was true).')
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

    let result = await client.getSnapshot({
      symbols: ctx.input.symbols,
      source: ctx.input.source,
      offset: ctx.input.offset
    });

    let snapshots = Array.isArray(result) ? result : [result];

    let trends: Record<string, any> | undefined;
    if (ctx.input.includeTrends) {
      trends = await client.getTrends({
        source: ctx.input.source,
        offset: ctx.input.offset
      });
    }

    return {
      output: {
        snapshots,
        trends
      },
      message: `Retrieved market snapshot for **${ctx.input.symbols.join(', ')}**.${ctx.input.includeTrends ? ' Trends data included.' : ''}`
    };
  })
  .build();
