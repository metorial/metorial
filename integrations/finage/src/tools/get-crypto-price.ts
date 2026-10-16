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

export let getCryptoPrice = SlateTool.create(spec, {
  name: 'Get Crypto Price',
  key: 'get_crypto_price',
  description: `Retrieve the latest trade price and previous close data for a cryptocurrency pair. Covers 7,000+ crypto pairs from 100+ markets. Available 24/7.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Crypto pair symbol (e.g. "BTCUSD", "ETHUSD", "SOLUSD")')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Original provider response'),
      symbol: z.string().describe('Crypto pair symbol'),
      price: z.number().optional().describe('Latest trade price'),
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
      client.getCryptoLastTrade(symbol),
      client.getCryptoPreviousClose(symbol)
    ]);
    let trade = finageRecord(primaryData);

    let output = pickDefined({
      symbol,
      price: finageNumber(trade.price),
      timestamp: finageNumber(trade.timestamp),
      previousClose: finagePreviousClose(previousData),
      raw: { trade: primaryData, previousClose: previousData }
    });
    if (output.price === undefined)
      throw createApiServiceError('Finage returned no current pricing for this symbol.');
    return {
      output: { ...output, symbol },
      message: `Retrieved latest pricing and previous close for **${symbol}**.`
    };
  })
  .build();
