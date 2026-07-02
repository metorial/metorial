import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
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
    let symbol = ctx.input.symbol.toUpperCase();

    let [tradeResult, prevCloseResult] = await Promise.allSettled([
      client.getCryptoLastTrade(symbol),
      client.getCryptoPreviousClose(symbol)
    ]);

    let trade = tradeResult.status === 'fulfilled' ? tradeResult.value : null;
    let prevClose = prevCloseResult.status === 'fulfilled' ? prevCloseResult.value : null;
    let prevBar = prevClose?.results?.[0] ?? prevClose;

    let output = {
      symbol,
      price: trade?.price,
      timestamp: trade?.timestamp,
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

    let priceStr = output.price ? `$${output.price.toLocaleString()}` : 'N/A';
    return {
      output,
      message: `**${symbol}** last trade: ${priceStr}${output.previousClose?.close ? `, previous close: $${output.previousClose.close.toLocaleString()}` : ''}`
    };
  })
  .build();
