import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let quoteSchema = z.object({
  price: z.number().nullable().describe('Price in the target currency'),
  volume24h: z.number().nullable().describe('24-hour trading volume'),
  volumeChange24h: z.number().nullable().describe('24-hour volume change percentage'),
  percentChange1h: z.number().nullable().describe('1-hour percent change'),
  percentChange24h: z.number().nullable().describe('24-hour percent change'),
  percentChange7d: z.number().nullable().describe('7-day percent change'),
  percentChange30d: z.number().nullable().describe('30-day percent change'),
  marketCap: z.number().nullable().describe('Market capitalization'),
  marketCapDominance: z.number().nullable().describe('Market cap dominance percentage'),
  fullyDilutedMarketCap: z.number().nullable().describe('Fully diluted market cap'),
  lastUpdated: z.string().nullable().describe('Last updated timestamp')
});

let platformSchema = z
  .object({
    id: z.number().describe('Platform CoinMarketCap ID'),
    name: z.string().describe('Platform name'),
    symbol: z.string().describe('Platform symbol'),
    slug: z.string().describe('Platform slug'),
    tokenAddress: z.string().describe('Token contract address on the platform')
  })
  .nullable();

let listingSchema = z.object({
  cryptocurrencyId: z.number().describe('CoinMarketCap cryptocurrency ID'),
  name: z.string().describe('Cryptocurrency name'),
  symbol: z.string().describe('Cryptocurrency ticker symbol'),
  slug: z.string().describe('URL-friendly slug'),
  cmcRank: z.number().describe('CoinMarketCap ranking'),
  numMarketPairs: z.number().describe('Number of active market pairs'),
  circulatingSupply: z.number().nullable().describe('Circulating supply'),
  totalSupply: z.number().nullable().describe('Total supply'),
  maxSupply: z.number().nullable().describe('Maximum supply'),
  dateAdded: z.string().describe('Date added to CoinMarketCap'),
  tags: z.array(z.string()).describe('Associated tags'),
  platform: platformSchema.describe('Token platform information if token-based'),
  quote: z.record(z.string(), quoteSchema).describe('Market quote data keyed by currency')
});

export let listCryptocurrencies = SlateTool.create(spec, {
  name: 'List Cryptocurrencies',
  key: 'list_cryptocurrencies',
  description: `Retrieve a ranked list of cryptocurrencies with latest market data including price, market cap, volume, and percentage changes. Supports filtering by price range, market cap, volume, and cryptocurrency type. Results can be sorted by various metrics and paginated.`,
  instructions: [
    'Use the "convert" parameter to get prices in a specific currency (e.g., "USD", "EUR", "BTC").',
    'Use "sort" with "sortDir" to control ordering. Default sort is by market cap descending.',
    'Combine filter parameters (priceMin/priceMax, marketCapMin/marketCapMax) to narrow results.'
  ],
  constraints: ['Maximum 5000 results per request.', 'Free plan supports this endpoint.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Offset for pagination (1-based). Default: 1'),
      limit: z
        .number()
        .optional()
        .describe('Number of results to return. Default: 100, max: 5000'),
      priceMin: z.number().optional().describe('Minimum USD price filter'),
      priceMax: z.number().optional().describe('Maximum USD price filter'),
      marketCapMin: z.number().optional().describe('Minimum market cap filter'),
      marketCapMax: z.number().optional().describe('Maximum market cap filter'),
      volume24hMin: z.number().optional().describe('Minimum 24h volume filter'),
      volume24hMax: z.number().optional().describe('Maximum 24h volume filter'),
      convert: z
        .string()
        .optional()
        .describe('Currency to quote prices in (e.g., "USD", "EUR", "BTC"). Default: USD'),
      sort: z
        .enum([
          'market_cap',
          'name',
          'symbol',
          'date_added',
          'market_cap_strict',
          'price',
          'circulating_supply',
          'total_supply',
          'max_supply',
          'num_market_pairs',
          'volume_24h',
          'percent_change_1h',
          'percent_change_24h',
          'percent_change_7d',
          'volume_7d',
          'volume_30d'
        ])
        .optional()
        .describe('Sort field. Default: market_cap'),
      sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction. Default: desc'),
      cryptocurrencyType: z
        .enum(['all', 'coins', 'tokens'])
        .optional()
        .describe('Filter by type. Default: all')
    })
  )
  .output(
    z.object({
      cryptocurrencies: z
        .array(listingSchema)
        .describe('List of cryptocurrencies with market data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let listings = await client.getCryptocurrencyListingsLatest({
      start: ctx.input.start,
      limit: ctx.input.limit,
      priceMin: ctx.input.priceMin,
      priceMax: ctx.input.priceMax,
      marketCapMin: ctx.input.marketCapMin,
      marketCapMax: ctx.input.marketCapMax,
      volume24hMin: ctx.input.volume24hMin,
      volume24hMax: ctx.input.volume24hMax,
      convert: ctx.input.convert,
      sort: ctx.input.sort,
      sortDir: ctx.input.sortDir,
      cryptocurrencyType: ctx.input.cryptocurrencyType
    });

    let cryptocurrencies = listings.map(listing => ({
      cryptocurrencyId: listing.id,
      name: listing.name,
      symbol: listing.symbol,
      slug: listing.slug,
      cmcRank: listing.cmcRank,
      numMarketPairs: listing.numMarketPairs,
      circulatingSupply: listing.circulatingSupply,
      totalSupply: listing.totalSupply,
      maxSupply: listing.maxSupply,
      dateAdded: listing.dateAdded,
      tags: listing.tags || [],
      platform: listing.platform,
      quote: listing.quote || {}
    }));

    let count = cryptocurrencies.length;
    let topEntry = cryptocurrencies[0];
    let summary = topEntry
      ? `Retrieved ${count} cryptocurrencies. Top result: **${topEntry.name}** (${topEntry.symbol}) ranked #${topEntry.cmcRank}.`
      : `No cryptocurrencies found matching the given criteria.`;

    return {
      output: { cryptocurrencies },
      message: summary
    };
  })
  .build();
