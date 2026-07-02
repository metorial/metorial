import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let exchangeQuoteSchema = z.object({
  volume24h: z.number().nullable().describe('24-hour trading volume'),
  volume24hAdjusted: z.number().nullable().describe('24-hour adjusted volume'),
  volume7d: z.number().nullable().describe('7-day trading volume'),
  volume30d: z.number().nullable().describe('30-day trading volume'),
  percentChangeVolume24h: z.number().nullable().describe('24-hour volume change percentage'),
  percentChangeVolume7d: z.number().nullable().describe('7-day volume change percentage'),
  percentChangeVolume30d: z.number().nullable().describe('30-day volume change percentage'),
  effectiveLiquidity24h: z.number().nullable().describe('24-hour effective liquidity'),
  lastUpdated: z.string().nullable().describe('Last updated timestamp')
});

let exchangeListingSchema = z.object({
  exchangeId: z.number().describe('CoinMarketCap exchange ID'),
  name: z.string().describe('Exchange name'),
  slug: z.string().describe('URL-friendly exchange slug'),
  numMarketPairs: z.number().describe('Number of active market pairs'),
  lastUpdated: z.string().describe('Last updated timestamp'),
  quote: z.record(z.string(), exchangeQuoteSchema).describe('Volume and liquidity data')
});

export let listExchanges = SlateTool.create(spec, {
  name: 'List Exchanges',
  key: 'list_exchanges',
  description: `Retrieve a ranked list of cryptocurrency exchanges with their latest volume, liquidity, and market pair data. Useful for comparing exchanges by volume, finding the most active exchanges, or identifying exchanges for specific market types.`,
  instructions: [
    'Results are sorted by volume by default.',
    'Use "convert" to see volumes in a specific currency.'
  ],
  constraints: ['Requires Standard plan or above for full access.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Offset for pagination (1-based). Default: 1'),
      limit: z.number().optional().describe('Number of results. Default: 100'),
      sort: z
        .enum([
          'volume_24h',
          'volume_24h_adjusted',
          'volume_7d',
          'volume_30d',
          'exchange_score'
        ])
        .optional()
        .describe('Sort field. Default: volume_24h'),
      sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction. Default: desc'),
      convert: z.string().optional().describe('Currency for volume conversion (e.g., "USD")')
    })
  )
  .output(
    z.object({
      exchanges: z.array(exchangeListingSchema).describe('List of exchanges')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let listings = await client.getExchangeListingsLatest({
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      sortDir: ctx.input.sortDir,
      convert: ctx.input.convert
    });

    let exchanges = listings.map(listing => ({
      exchangeId: listing.id,
      name: listing.name,
      slug: listing.slug,
      numMarketPairs: listing.numMarketPairs,
      lastUpdated: listing.lastUpdated,
      quote: listing.quote || {}
    }));

    let count = exchanges.length;
    let top = exchanges[0];
    let message = top
      ? `Retrieved ${count} exchanges. Top exchange: **${top.name}** with ${top.numMarketPairs} market pairs.`
      : 'No exchanges found.';

    return {
      output: { exchanges },
      message
    };
  })
  .build();
