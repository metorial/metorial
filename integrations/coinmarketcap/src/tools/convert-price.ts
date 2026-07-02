import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let conversionResultSchema = z.object({
  cryptocurrencyId: z.number().describe('CoinMarketCap ID of the source currency'),
  symbol: z.string().describe('Symbol of the source currency'),
  name: z.string().describe('Name of the source currency'),
  amount: z.number().describe('Original amount being converted'),
  lastUpdated: z.string().describe('Last updated timestamp for the conversion rate'),
  quote: z
    .record(
      z.string(),
      z.object({
        price: z.number().nullable().describe('Converted amount in the target currency'),
        lastUpdated: z.string().nullable().describe('Last updated timestamp for this quote')
      })
    )
    .describe('Conversion results keyed by target currency')
});

export let convertPrice = SlateTool.create(spec, {
  name: 'Convert Price',
  key: 'convert_price',
  description: `Convert an amount between any supported cryptocurrency and fiat currency using real-time exchange rates. Supports conversion between crypto-to-crypto, crypto-to-fiat, and fiat-to-crypto pairs.`,
  instructions: [
    'Provide the source currency as either a symbol or CoinMarketCap ID.',
    'Specify target currency(ies) in the "convert" parameter (e.g., "USD,EUR,BTC").',
    'Use "time" parameter for historical conversion at a specific point in time (ISO 8601 format).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      amount: z.number().describe('Amount to convert'),
      symbol: z
        .string()
        .optional()
        .describe('Source currency symbol (e.g., "BTC", "ETH", "USD")'),
      cryptocurrencyId: z.string().optional().describe('Source currency CoinMarketCap ID'),
      convert: z
        .string()
        .optional()
        .describe('Comma-separated target currencies (e.g., "USD,EUR,BTC"). Default: USD'),
      time: z
        .string()
        .optional()
        .describe(
          'Optional historical timestamp in ISO 8601 format for conversion at a specific time'
        )
    })
  )
  .output(conversionResultSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.priceConversion({
      amount: ctx.input.amount,
      symbol: ctx.input.symbol,
      id: ctx.input.cryptocurrencyId,
      convert: ctx.input.convert,
      time: ctx.input.time
    });

    let targets = Object.keys(result.quote || {});
    let conversions = targets
      .map(currency => {
        let q = result.quote[currency];
        return `${q?.price ?? 'N/A'} ${currency}`;
      })
      .join(', ');

    return {
      output: {
        cryptocurrencyId: result.id,
        symbol: result.symbol,
        name: result.name,
        amount: result.amount,
        lastUpdated: result.lastUpdated,
        quote: result.quote || {}
      },
      message: `Converted ${ctx.input.amount} ${result.symbol} → ${conversions}.`
    };
  })
  .build();
