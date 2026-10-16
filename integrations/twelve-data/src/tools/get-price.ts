import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { providerError, record, requiredString } from '../lib/response';
import { spec } from '../spec';

export let getPrice = SlateTool.create(spec, {
  name: 'Get Latest Price',
  key: 'get_price',
  description: `Retrieve the latest available price for one or more financial instruments. Freshness depends on exchange coverage, subscription entitlements, and market sessions; this endpoint does not return a quote timestamp.
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
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete provider response, preserving unavailable values and metadata'),
      prices: z
        .array(
          z.object({
            symbol: z
              .string()
              .describe(
                'Requested ticker used to associate this price; the single-symbol provider response does not return a symbol'
              ),
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
      prices.push({ symbol: symbols[0]!, price: requiredString(result.price, 'price') });
    } else {
      for (let sym of symbols) {
        let data = record(result[sym], `price for ${sym}`);
        if (data.status === 'error') throw providerError(data);
        prices.push({ symbol: sym, price: requiredString(data.price, `price for ${sym}`) });
      }
    }

    let priceList = prices.map(p => `**${p.symbol}**: ${p.price}`).join(', ');

    return {
      output: { prices, raw: result },
      message: `Latest available prices: ${priceList}`
    };
  })
  .build();
