import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let marketPairQuoteSchema = z.object({
  price: z.number().nullable().describe('Current trading price'),
  volume24h: z.number().nullable().describe('24-hour trading volume'),
  lastUpdated: z.string().nullable().describe('Last updated timestamp'),
  effectiveLiquidity: z.number().nullable().describe('Effective liquidity score')
});

let marketPairSchema = z.object({
  exchange: z
    .object({
      exchangeId: z.number().describe('Exchange CoinMarketCap ID'),
      name: z.string().describe('Exchange name'),
      slug: z.string().describe('Exchange slug')
    })
    .describe('Exchange information'),
  marketPairId: z.number().describe('Market pair ID'),
  marketPair: z.string().describe('Market pair name (e.g., "BTC/USDT")'),
  category: z.string().describe('Market category (spot, derivatives, etc.)'),
  feeType: z.string().describe('Fee type (percentage, flat, etc.)'),
  marketUrl: z.string().describe('Direct URL to the trading pair on the exchange'),
  quote: z.record(z.string(), marketPairQuoteSchema).describe('Quote data for this pair')
});

export let getMarketPairs = SlateTool.create(spec, {
  name: 'Get Market Pairs',
  key: 'get_market_pairs',
  description: `List the active trading pairs for a specific cryptocurrency across exchanges. Shows which exchanges list the pair, current price, volume, and liquidity for each market pair. Useful for finding where a cryptocurrency can be traded.`,
  instructions: [
    'Provide one of: cryptocurrencyId, symbol, or slug to identify the cryptocurrency.',
    'Use "matchedSymbol" to filter pairs involving a specific quote currency (e.g., "USDT").',
    'Use "category" to filter by market type (spot, derivatives, otc, perpetual).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cryptocurrencyId: z
        .string()
        .optional()
        .describe('CoinMarketCap ID of the cryptocurrency'),
      symbol: z.string().optional().describe('Cryptocurrency symbol (e.g., "BTC")'),
      slug: z.string().optional().describe('Cryptocurrency slug (e.g., "bitcoin")'),
      start: z.number().optional().describe('Offset for pagination (1-based). Default: 1'),
      limit: z.number().optional().describe('Number of results. Default: 100'),
      matchedSymbol: z
        .string()
        .optional()
        .describe('Filter to pairs with this quote currency (e.g., "USDT", "USD")'),
      category: z
        .enum(['all', 'spot', 'derivatives', 'otc', 'perpetual'])
        .optional()
        .describe('Market category filter. Default: all'),
      convert: z.string().optional().describe('Currency for volume conversion (e.g., "USD")')
    })
  )
  .output(
    z.object({
      cryptocurrencyId: z.number().describe('CoinMarketCap cryptocurrency ID'),
      name: z.string().describe('Cryptocurrency name'),
      symbol: z.string().describe('Cryptocurrency symbol'),
      numMarketPairs: z.number().describe('Total number of market pairs'),
      marketPairs: z.array(marketPairSchema).describe('List of market pairs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let data = await client.getCryptocurrencyMarketPairs({
      id: ctx.input.cryptocurrencyId,
      symbol: ctx.input.symbol,
      slug: ctx.input.slug,
      start: ctx.input.start,
      limit: ctx.input.limit,
      matchedSymbol: ctx.input.matchedSymbol,
      category: ctx.input.category,
      convert: ctx.input.convert
    });

    let marketPairs = (data.marketPairs || []).map(pair => ({
      exchange: {
        exchangeId: pair.exchange.id,
        name: pair.exchange.name,
        slug: pair.exchange.slug
      },
      marketPairId: pair.marketId,
      marketPair: pair.marketPair,
      category: pair.category,
      feeType: pair.feeType,
      marketUrl: pair.marketUrl,
      quote: pair.quote || {}
    }));

    return {
      output: {
        cryptocurrencyId: data.id,
        name: data.name,
        symbol: data.symbol,
        numMarketPairs: data.numMarketPairs,
        marketPairs
      },
      message: `Found **${marketPairs.length}** market pairs for **${data.name}** (${data.symbol}) out of ${data.numMarketPairs} total.`
    };
  })
  .build();
