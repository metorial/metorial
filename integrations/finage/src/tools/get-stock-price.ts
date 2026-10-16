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

export let getStockPrice = SlateTool.create(spec, {
  name: 'Get Stock Price',
  key: 'get_stock_price',
  description: `Retrieve the latest price data for a US stock symbol. Returns the last trade price, last bid/ask quote, and previous close data in a single call. Useful for getting a complete current pricing picture of any US-listed stock.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Stock ticker symbol (e.g. "AAPL", "MSFT", "TSLA")')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Original provider response'),
      symbol: z.string().describe('Stock ticker symbol'),
      ask: z.number().optional().describe('Latest ask price'),
      bid: z.number().optional().describe('Latest bid price'),
      askSize: z.number().optional().describe('Ask size'),
      bidSize: z.number().optional().describe('Bid size'),
      lastTradePrice: z.number().optional().describe('Last trade price'),
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
    let [primaryData, previousData, tradeData] = await Promise.all([
      client.getStockLastQuote(symbol),
      client.getStockPreviousClose(symbol),
      client.getStockLastTrade(symbol)
    ]);
    let quote = finageRecord(primaryData);
    let trade = finageRecord(tradeData);
    let output = pickDefined({
      symbol,
      ask: finageNumber(quote.ask),
      bid: finageNumber(quote.bid),
      askSize: finageNumber(quote.asize),
      bidSize: finageNumber(quote.bsize),
      lastTradePrice: finageNumber(trade.price),
      timestamp: finageNumber(quote.timestamp),
      previousClose: finagePreviousClose(previousData),
      raw: { quote: primaryData, previousClose: previousData, trade: tradeData }
    });
    if (output.ask === undefined && output.bid === undefined)
      throw createApiServiceError('Finage returned no current pricing for this symbol.');
    return {
      output: { ...output, symbol },
      message: `Retrieved latest pricing and previous close for **${symbol}**.`
    };
  })
  .build();
