import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
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
    let symbol = ctx.input.symbol.toUpperCase();

    let [quoteResult, prevCloseResult] = await Promise.allSettled([
      client.getStockLastQuote(symbol),
      client.getStockPreviousClose(symbol)
    ]);

    let quote = quoteResult.status === 'fulfilled' ? quoteResult.value : null;
    let prevClose = prevCloseResult.status === 'fulfilled' ? prevCloseResult.value : null;

    let prevCloseBar = prevClose?.results?.[0] ?? prevClose;

    let output = {
      symbol,
      ask: quote?.ask,
      bid: quote?.bid,
      askSize: quote?.asize,
      bidSize: quote?.bsize,
      lastTradePrice: quote?.ask && quote?.bid ? (quote.ask + quote.bid) / 2 : undefined,
      timestamp: quote?.timestamp,
      previousClose: prevCloseBar
        ? {
            open: prevCloseBar.o,
            high: prevCloseBar.h,
            low: prevCloseBar.l,
            close: prevCloseBar.c,
            volume: prevCloseBar.v
          }
        : undefined
    };

    let priceStr = output.bid ? `$${output.bid.toFixed(2)}` : 'N/A';
    return {
      output,
      message: `**${symbol}** current bid: ${priceStr}${output.previousClose?.close ? `, previous close: $${output.previousClose.close.toFixed(2)}` : ''}`
    };
  })
  .build();
