import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createRealtimeClient, realtimeRecords } from '../lib/realtime-client';
import { spec } from '../spec';

export let getOptionsChain = SlateTool.create(spec, {
  name: 'Get Options Chain',
  key: 'get_options_chain',
  description: `Retrieve the options chain for an underlying symbol, including option prices, Greeks, and volatility data. Returns contracts sorted by type, expiration, and strike price.
Requires OAuth2 authentication with the Real-Time/Delayed REST API.`,
  instructions: [
    'Requires OAuth2 Client Credentials authentication (not API Key).',
    'Set includeGreeks to true to fetch Greeks for every returned contract identifier. This makes additional requests and requires real-time Greeks entitlement.'
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
    let client = createRealtimeClient(ctx.auth);

    let chainResult = await client.getOptionsChain({
      symbol: ctx.input.symbol,
      source: ctx.input.source,
      offset: ctx.input.offset
    });

    let chain = realtimeRecords(chainResult, 'options chain');

    let greeks: Record<string, unknown>[] | undefined;
    if (ctx.input.includeGreeks) {
      if (ctx.input.offset === 'delayed')
        throw createApiServiceError(
          'Nasdaq option Greeks are currently available only in real time. Disable includeGreeks for delayed chains.'
        );
      let identifiers = chain.map(contract => {
        if (typeof contract.identifier !== 'string' || !contract.identifier.trim()) {
          throw createApiServiceError(
            'Nasdaq returned an options contract without its identifier.'
          );
        }
        return contract.identifier;
      });
      greeks = [];
      for (let index = 0; index < identifiers.length; index += 4) {
        let batch = await Promise.all(
          identifiers
            .slice(index, index + 4)
            .map(async identifier =>
              realtimeRecords(await client.getOptionGreeks(identifier), 'option Greeks')
            )
        );
        greeks.push(...batch.flat());
      }
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
