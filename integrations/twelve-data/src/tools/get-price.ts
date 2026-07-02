import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { spec } from '../spec';

export let getPrice = SlateTool.create(spec, {
  name: 'Get Real-Time Price',
  key: 'get_price',
  description: `Retrieve the current real-time price for one or more financial instruments. This is the simplest and fastest way to get the latest price.
Supports multiple symbols in a single request by providing a comma-separated list.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z
        .string()
        .describe('Ticker symbol or comma-separated symbols (e.g., "AAPL", "AAPL,MSFT,GOOG")'),
      exchange: z.string().optional().describe('Exchange where the instrument is traded'),
      country: z.string().optional().describe('Country of the exchange'),
      prepost: z.boolean().optional().describe('Include pre/post market data for US equities')
    })
  )
  .output(
    z.object({
      prices: z
        .array(
          z.object({
            symbol: z.string().describe('Ticker symbol'),
            price: z.string().describe('Current price')
          })
        )
        .describe('Array of symbol-price pairs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwelveDataClient(ctx.auth.token);

    let result = await client.getPrice({
      symbol: ctx.input.symbol,
      exchange: ctx.input.exchange,
      country: ctx.input.country,
      prepost: ctx.input.prepost
    });

    let symbols = ctx.input.symbol.split(',').map(s => s.trim());
    let prices: Array<{ symbol: string; price: string }> = [];

    if (symbols.length === 1) {
      prices.push({ symbol: symbols[0]!, price: result.price });
    } else {
      for (let sym of symbols) {
        let data = result[sym];
        if (data?.price) {
          prices.push({ symbol: sym, price: data.price });
        }
      }
    }

    let priceList = prices.map(p => `**${p.symbol}**: ${p.price}`).join(', ');

    return {
      output: { prices },
      message: `Current prices: ${priceList}`
    };
  })
  .build();
