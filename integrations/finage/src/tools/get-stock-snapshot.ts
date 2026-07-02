import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { spec } from '../spec';

export let getStockSnapshot = SlateTool.create(spec, {
  name: 'Get Stock Snapshot',
  key: 'get_stock_snapshot',
  description: `Retrieve a real-time snapshot of one or more US stocks, including latest quotes (bid/ask) and last trade prices. If no symbols are specified, returns data for all available stocks. Useful for monitoring multiple stocks at once.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbols: z
        .array(z.string())
        .optional()
        .describe(
          'Stock ticker symbols to query (e.g. ["AAPL", "MSFT"]). Leave empty for all stocks.'
        ),
      includeQuotes: z.boolean().default(true).describe('Include last bid/ask quotes'),
      includeTrades: z.boolean().default(true).describe('Include last trade prices')
    })
  )
  .output(
    z.object({
      totalResults: z.number().optional().describe('Number of results returned'),
      quotes: z
        .array(
          z.object({
            symbol: z.string().describe('Stock symbol'),
            ask: z.number().optional().describe('Ask price'),
            bid: z.number().optional().describe('Bid price'),
            askSize: z.number().optional().describe('Ask size'),
            bidSize: z.number().optional().describe('Bid size'),
            timestamp: z.number().optional().describe('Timestamp in milliseconds')
          })
        )
        .optional()
        .describe('Last quotes for each symbol'),
      trades: z
        .array(
          z.object({
            symbol: z.string().describe('Stock symbol'),
            price: z.number().optional().describe('Last trade price'),
            size: z.number().optional().describe('Trade size'),
            timestamp: z.number().optional().describe('Timestamp in milliseconds')
          })
        )
        .optional()
        .describe('Last trades for each symbol')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });

    let symbolsStr = ctx.input.symbols?.map(s => s.toUpperCase()).join(',');

    let data = await client.getStockSnapshot({
      symbols: symbolsStr,
      quotes: ctx.input.includeQuotes,
      trades: ctx.input.includeTrades
    });

    let quotes = (data.lastQuotes || []).map((q: any) => ({
      symbol: q.s,
      ask: q.a,
      bid: q.b,
      askSize: q.asz,
      bidSize: q.bsz,
      timestamp: q.t
    }));

    let trades = (data.lastTrades || []).map((t: any) => ({
      symbol: t.s,
      price: t.p,
      size: t.sz,
      timestamp: t.t
    }));

    return {
      output: {
        totalResults: data.totalResults,
        quotes: ctx.input.includeQuotes ? quotes : undefined,
        trades: ctx.input.includeTrades ? trades : undefined
      },
      message: `Snapshot returned **${data.totalResults || 0}** results${symbolsStr ? ` for ${symbolsStr}` : ''}.`
    };
  })
  .build();
