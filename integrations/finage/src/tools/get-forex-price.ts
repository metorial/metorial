import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import {
  finageNumber,
  finagePreviousClose,
  finageRecord,
  finageSymbol
} from '../lib/response';
import { spec } from '../spec';

export let getForexPrice = SlateTool.create(spec, {
  name: 'Get Forex Price',
  key: 'get_forex_price',
  description: `Retrieve the latest quote and previous close for a forex currency pair. Supports 2,000+ currency pairs including majors, minors, and exotics. Provides bid/ask spread and previous close OHLCV data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Forex pair symbol (e.g. "GBPUSD", "EURUSD", "USDJPY")')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Original provider response'),
      symbol: z.string().describe('Forex pair symbol'),
      ask: z.number().optional().describe('Ask price'),
      bid: z.number().optional().describe('Bid price'),
      timestamp: z.number().optional().describe('Timestamp in milliseconds'),
      previousClose: z
        .object({
          open: z.number().optional().describe('Previous open price'),
          high: z.number().optional().describe('Previous high price'),
          low: z.number().optional().describe('Previous low price'),
          close: z.number().optional().describe('Previous close price'),
          volume: z.number().optional().describe('Previous volume')
        })
        .optional()
        .describe('Previous close data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let symbol = finageSymbol(ctx.input.symbol);
    let [primaryData, previousData] = await Promise.all([
      client.getForexLastQuote(symbol),
      client.getForexPreviousClose(symbol)
    ]);
    let quote = finageRecord(primaryData);

    let output = pickDefined({
      symbol,
      ask: finageNumber(quote.ask),
      bid: finageNumber(quote.bid),
      timestamp: finageNumber(quote.timestamp),
      previousClose: finagePreviousClose(previousData),
      raw: { quote: primaryData, previousClose: previousData }
    });
    if (output.ask === undefined && output.bid === undefined)
      throw createApiServiceError('Finage returned no current pricing for this symbol.');
    return {
      output: { ...output, symbol },
      message: `Retrieved latest pricing and previous close for **${symbol}**.`
    };
  })
  .build();
