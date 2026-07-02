import { SlateTool } from 'slates';
import { z } from 'zod';
import { RealtimeClient } from '../lib/realtime-client';
import { spec } from '../spec';

export let getOptionsChain = SlateTool.create(spec, {
  name: 'Get Options Chain',
  key: 'get_options_chain',
  description: `Retrieve the options chain for an underlying symbol, including option prices, Greeks, and volatility data. Returns contracts sorted by type, expiration, and strike price.
Requires OAuth2 authentication with the Real-Time/Delayed REST API.`,
  instructions: [
    'Requires OAuth2 Client Credentials authentication (not API Key).',
    'Set includeGreeks to true to also fetch Greeks and implied volatility data.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Underlying stock ticker symbol (e.g., "AAPL").'),
      includeGreeks: z
        .boolean()
        .optional()
        .describe('Also fetch Greeks and implied volatility data.'),
      source: z.enum(['Nasdaq']).optional().describe('Data source.'),
      offset: z
        .enum(['realtime', 'delayed'])
        .optional()
        .describe('Whether to get real-time or delayed data.')
    })
  )
  .output(
    z.object({
      chain: z.array(z.record(z.string(), z.any())).describe('Options chain contracts.'),
      greeks: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Greeks and volatility data (if includeGreeks was true).')
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

    let chainResult = await client.getOptionsChain({
      symbol: ctx.input.symbol,
      source: ctx.input.source,
      offset: ctx.input.offset
    });

    let chain = Array.isArray(chainResult) ? chainResult : [chainResult];

    let greeks: Record<string, any>[] | undefined;
    if (ctx.input.includeGreeks) {
      let greeksResult = await client.getGreeksAndVols({ symbols: [ctx.input.symbol] });
      greeks = Array.isArray(greeksResult) ? greeksResult : [greeksResult];
    }

    return {
      output: {
        chain,
        greeks
      },
      message: `Retrieved options chain for **${ctx.input.symbol}** with ${chain.length} contracts.${ctx.input.includeGreeks ? ' Greeks and volatility data included.' : ''}`
    };
  })
  .build();
