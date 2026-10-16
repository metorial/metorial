import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import {
  finageNumber,
  finageRecord,
  finageRecords,
  finageSymbol,
  requiredFinageString
} from '../lib/response';
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
      raw: z.unknown().optional().describe('Original provider response'),
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
    if (!ctx.input.includeQuotes && !ctx.input.includeTrades)
      throw createApiServiceError('Enable includeQuotes, includeTrades, or both.');
    let symbolsStr = ctx.input.symbols?.map(finageSymbol).join(',');
    let data = await client.getStockSnapshot({
      symbols: symbolsStr,
      quotes: ctx.input.includeQuotes,
      trades: ctx.input.includeTrades
    });
    let response = finageRecord(data);
    let quotes = ctx.input.includeQuotes
      ? finageRecords(response.lastQuotes).map(q => ({
          ...pickDefined({
            ask: finageNumber(q.a),
            bid: finageNumber(q.b),
            askSize: finageNumber(q.asz),
            bidSize: finageNumber(q.bsz),
            timestamp: finageNumber(q.t)
          }),
          symbol: requiredFinageString(q.s, 'a stock symbol')
        }))
      : undefined;
    let trades = ctx.input.includeTrades
      ? finageRecords(response.lastTrades).map(t => ({
          ...pickDefined({
            price: finageNumber(t.p),
            size: finageNumber(t.sz),
            timestamp: finageNumber(t.t)
          }),
          symbol: requiredFinageString(t.s, 'a stock symbol')
        }))
      : undefined;
    return {
      output: pickDefined({
        totalResults: finageNumber(response.totalResults),
        quotes,
        trades,
        raw: data
      }),
      message: `Retrieved stock snapshot${symbolsStr ? ` for ${symbolsStr}` : ''}.`
    };
  })
  .build();
