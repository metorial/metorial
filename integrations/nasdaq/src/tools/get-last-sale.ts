import { SlateTool } from 'slates';
import { z } from 'zod';
import { createRealtimeClient, realtimeRecords } from '../lib/realtime-client';
import { spec } from '../spec';

export let getLastSale = SlateTool.create(spec, {
  name: 'Get Last Sale',
  key: 'get_last_sale',
  description: `Get the latest last-sale eligible transaction for one or more securities. Returns real-time or delayed pricing data including price, size, and trade conditions.
Also supports fetching the latest bid/ask quote or most recent trade. Requires OAuth2 authentication with the Real-Time/Delayed REST API.`,
  instructions: [
    'Requires OAuth2 Client Credentials authentication (not API Key).',
    'Set dataType to "sale" for last sale, "trade" for last trade, or "quote" for bid/ask quotes.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbols: z
        .array(z.string())
        .describe('List of stock ticker symbols (e.g., ["AAPL", "MSFT", "GOOG"]).'),
      dataType: z
        .enum(['sale', 'trade', 'quote'])
        .default('sale')
        .describe(
          'Type of data: "sale" for last sale, "trade" for last trade, "quote" for bid/ask.'
        ),
      source: z
        .enum(['Nasdaq', 'BX', 'PSX', 'CQT'])
        .optional()
        .describe('Data source exchange.'),
      offset: z
        .enum(['realtime', 'delayed'])
        .optional()
        .describe('Whether to get real-time or delayed data.')
    })
  )
  .output(
    z.object({
      quotes: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of quote/sale records for the requested symbols.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createRealtimeClient(ctx.auth);

    let result: unknown;
    let params = {
      symbols: ctx.input.symbols,
      source: ctx.input.source,
      offset: ctx.input.offset
    };

    if (ctx.input.dataType === 'trade') {
      result = await client.getLastTrade(params);
    } else if (ctx.input.dataType === 'quote') {
      result = await client.getLastQuote(params);
    } else {
      result = await client.getLastSale(params);
    }

    let quotes = realtimeRecords(result, 'quotes');

    return {
      output: {
        quotes
      },
      message: `Retrieved last ${ctx.input.dataType} data for **${ctx.input.symbols.join(', ')}**.`
    };
  })
  .build();
