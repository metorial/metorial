import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
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
    let symbol = ctx.input.symbol.toUpperCase();

    let [quoteResult, prevCloseResult] = await Promise.allSettled([
      client.getForexLastQuote(symbol),
      client.getForexPreviousClose(symbol)
    ]);

    let quote = quoteResult.status === 'fulfilled' ? quoteResult.value : null;
    let prevClose = prevCloseResult.status === 'fulfilled' ? prevCloseResult.value : null;
    let prevBar = prevClose?.results?.[0] ?? prevClose;

    let output = {
      symbol,
      ask: quote?.ask,
      bid: quote?.bid,
      timestamp: quote?.timestamp,
      previousClose: prevBar
        ? {
            open: prevBar.o,
            high: prevBar.h,
            low: prevBar.l,
            close: prevBar.c,
            volume: prevBar.v
          }
        : undefined
    };

    let rateStr = output.bid ? output.bid.toFixed(5) : 'N/A';
    return {
      output,
      message: `**${symbol}** bid: ${rateStr}${output.previousClose?.close ? `, previous close: ${output.previousClose.close.toFixed(5)}` : ''}`
    };
  })
  .build();
