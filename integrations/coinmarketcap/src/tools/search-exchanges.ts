import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchExchanges = SlateTool.create(spec, {
  name: 'Search Exchanges',
  key: 'search_exchanges',
  description:
    'Discover CoinMarketCap exchange IDs and slugs, including active, inactive, or untracked exchanges. Use these IDs with Get Exchange Info.',
  instructions: [
    'A slug filter selects specific exchanges and takes precedence over other filters.',
    'Use cryptocurrencyId to find exchanges that list a particular currency.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      slugs: z.string().optional().describe('Comma-separated exchange slugs, such as binance'),
      listingStatus: z
        .string()
        .optional()
        .describe('One or more comma-separated listing states: active, inactive, untracked'),
      start: z.number().optional().describe('Pagination start, beginning at 1'),
      limit: z.number().optional().describe('Number of exchanges to return, up to 5000'),
      sort: z.enum(['volume_24h', 'id']).optional().describe('Exchange ranking or ID sort'),
      cryptocurrencyId: z
        .string()
        .optional()
        .describe(
          'Currency ID to filter exchanges by. Use Search Cryptocurrencies to find IDs.'
        )
    })
  )
  .output(
    z.object({
      exchanges: z.array(
        z.object({
          exchangeId: z.number().describe('CoinMarketCap exchange ID'),
          name: z.string().describe('Exchange name'),
          slug: z.string().describe('Exchange slug'),
          isActive: z
            .boolean()
            .optional()
            .describe('Whether the exchange is actively tracked'),
          status: z.string().optional().describe('Exchange listing status'),
          firstHistoricalData: z
            .string()
            .nullable()
            .optional()
            .describe('Earliest available market data timestamp'),
          lastHistoricalData: z
            .string()
            .nullable()
            .optional()
            .describe('Latest available market data timestamp')
        })
      ),
      raw: z.unknown().optional().describe('Unmodified provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    let entries = await client.getExchangeMap({
      slug: ctx.input.slugs,
      listingStatus: ctx.input.listingStatus,
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      cryptoId: ctx.input.cryptocurrencyId
    });
    let exchanges = entries.map(entry => ({
      exchangeId: entry.id,
      name: entry.name,
      slug: entry.slug,
      isActive: entry.isActive === 1 ? true : entry.isActive === 0 ? false : undefined,
      status: entry.status,
      firstHistoricalData: entry.firstHistoricalData,
      lastHistoricalData: entry.lastHistoricalData
    }));
    return {
      output: { exchanges, raw: client.rawResponse },
      message: `Found ${exchanges.length} exchanges.`
    };
  })
  .build();
