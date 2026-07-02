import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let mapEntrySchema = z.object({
  cryptocurrencyId: z.number().describe('CoinMarketCap cryptocurrency ID'),
  name: z.string().describe('Cryptocurrency name'),
  symbol: z.string().describe('Cryptocurrency ticker symbol'),
  slug: z.string().describe('URL-friendly slug'),
  rank: z.number().describe('CoinMarketCap ranking'),
  isActive: z.boolean().describe('Whether the cryptocurrency is currently active'),
  firstHistoricalData: z
    .string()
    .nullable()
    .describe('Earliest available historical data timestamp'),
  lastHistoricalData: z.string().nullable().describe('Most recent historical data timestamp'),
  platform: z
    .object({
      id: z.number().describe('Platform CoinMarketCap ID'),
      name: z.string().describe('Platform name'),
      symbol: z.string().describe('Platform symbol'),
      slug: z.string().describe('Platform slug'),
      tokenAddress: z.string().describe('Token contract address')
    })
    .nullable()
    .describe('Token platform information if token-based')
});

export let searchCryptocurrencies = SlateTool.create(spec, {
  name: 'Search Cryptocurrencies',
  key: 'search_cryptocurrencies',
  description: `Look up cryptocurrencies by symbol to find their CoinMarketCap IDs, slugs, ranks, and platform details. Useful for mapping between symbols and IDs, or discovering tokens on specific platforms.`,
  instructions: [
    'Use "symbol" to search for specific cryptocurrencies by their ticker symbol (e.g., "BTC,ETH").',
    'Use "listingStatus" to find active, inactive, or untracked cryptocurrencies.',
    'Results include platform info for tokens built on other blockchains.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z
        .string()
        .optional()
        .describe('Comma-separated symbols to look up (e.g., "BTC,ETH,SOL")'),
      listingStatus: z
        .enum(['active', 'inactive', 'untracked'])
        .optional()
        .describe('Filter by listing status. Default: active'),
      start: z.number().optional().describe('Offset for pagination (1-based)'),
      limit: z.number().optional().describe('Number of results. Default: 100, max: 5000'),
      sort: z.enum(['cmc_rank', 'id']).optional().describe('Sort field. Default: id')
    })
  )
  .output(
    z.object({
      cryptocurrencies: z
        .array(mapEntrySchema)
        .describe('List of matched cryptocurrency entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let entries = await client.getCryptocurrencyMap({
      symbol: ctx.input.symbol,
      listingStatus: ctx.input.listingStatus,
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort
    });

    let cryptocurrencies = entries.map(entry => ({
      cryptocurrencyId: entry.id,
      name: entry.name,
      symbol: entry.symbol,
      slug: entry.slug,
      rank: entry.rank,
      isActive: entry.isActive === 1,
      firstHistoricalData: entry.firstHistoricalData,
      lastHistoricalData: entry.lastHistoricalData,
      platform: entry.platform
    }));

    let count = cryptocurrencies.length;
    let message =
      count > 0
        ? `Found ${count} cryptocurrency(ies).${ctx.input.symbol ? ` Searched for: ${ctx.input.symbol}.` : ''}`
        : 'No cryptocurrencies found matching the criteria.';

    return {
      output: { cryptocurrencies },
      message
    };
  })
  .build();
