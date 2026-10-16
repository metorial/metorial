import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoinrankingClient } from '../lib/client';
import { paginationSchema, rawDataSchema } from '../lib/schemas';
import { spec } from '../spec';

let coinSummarySchema = z.object({
  coinUuid: z.string().describe('Unique identifier of the coin'),
  symbol: z.string().describe('Ticker symbol (e.g. BTC)'),
  name: z.string().describe('Full name of the coin'),
  iconUrl: z.string().nullable().describe('URL of the coin icon'),
  price: z.string().nullable().describe('Current price in reference currency'),
  marketCap: z.string().nullable().describe('Market capitalization'),
  volume24h: z.string().nullable().describe('24-hour trading volume'),
  change: z.string().nullable().describe('Price change percentage'),
  rank: z.number().nullable().describe('Rank by market cap'),
  btcPrice: z.string().nullable().describe('Price in Bitcoin'),
  lowVolume: z.boolean().nullable().describe('Whether the coin has low trading volume')
});

export let listCoins = SlateTool.create(spec, {
  name: 'List Coins',
  key: 'list_coins',
  description: `Browse and filter a comprehensive list of cryptocurrencies. Supports filtering by tags (e.g. defi, stablecoin), tiers, and text search. Results can be sorted by market cap, price, volume, change, and more.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Filter coins by name or symbol'),
      symbols: z
        .array(z.string())
        .optional()
        .describe('Filter by ticker symbols; symbols may identify multiple coins'),
      uuids: z
        .array(z.string())
        .optional()
        .describe('Filter by coin UUIDs discovered with search or list_coins'),
      contractAddresses: z
        .array(z.string())
        .optional()
        .describe('Filter by token contract addresses'),
      blockchains: z
        .array(z.string())
        .optional()
        .describe('Filter by blockchain names such as ethereum'),
      tags: z
        .array(z.string())
        .optional()
        .describe(
          'Filter by tag slugs (e.g. defi, stablecoin, nft); call list_tags to discover tags'
        ),
      tiers: z
        .array(z.enum(['1', '2', '3']))
        .optional()
        .describe('Filter by coin quality tiers (1 = highest quality)'),
      orderBy: z
        .enum(['marketCap', 'price', '24hVolume', 'change', 'listedAt'])
        .optional()
        .describe('Sort criteria'),
      orderDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      timePeriod: z
        .enum(['1h', '3h', '12h', '24h', '7d', '30d', '3m', '1y', '3y', '5y'])
        .optional()
        .describe('Time period for change calculation'),
      referenceCurrencyUuid: z
        .string()
        .optional()
        .describe('UUID of currency for price calculations'),
      limit: z
        .number()
        .optional()
        .describe('Number of results (max 100 for free plan, default 50)'),
      offset: z
        .number()
        .optional()
        .describe('Offset for pagination; use cursor for later pages'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Cursor from pagination.nextCursor or pagination.previousCursor; omit offset when provided'
        )
    })
  )
  .output(
    z.object({
      rawData: rawDataSchema
        .optional()
        .describe('Original provider data, including additional fields'),
      pagination: paginationSchema
        .optional()
        .describe('Provider cursor pagination information'),
      coins: z.array(coinSummarySchema).describe('List of coins matching the filters'),
      totalCoins: z.number().describe('Total number of coins matching the filters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinrankingClient({
      token: ctx.auth.token,
      referenceCurrencyUuid: ctx.config.referenceCurrencyUuid
    });

    let result = await client.listCoins({
      search: ctx.input.search,
      symbols: ctx.input.symbols,
      uuids: ctx.input.uuids,
      contractAddresses: ctx.input.contractAddresses,
      blockchains: ctx.input.blockchains,
      tags: ctx.input.tags,
      tiers: ctx.input.tiers,
      orderBy: ctx.input.orderBy,
      orderDirection: ctx.input.orderDirection,
      timePeriod: ctx.input.timePeriod,
      referenceCurrencyUuid: ctx.input.referenceCurrencyUuid,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      cursor: ctx.input.cursor
    });

    let data = result.data;
    let coins = data.coins.map(c => ({
      coinUuid: c.uuid,
      symbol: c.symbol,
      name: c.name,
      iconUrl: c.iconUrl ?? null,
      price: c.price ?? null,
      marketCap: c.marketCap ?? null,
      volume24h: c['24hVolume'] ?? null,
      change: c.change ?? null,
      rank: c.rank ?? null,
      btcPrice: c.btcPrice ?? null,
      lowVolume: c.lowVolume ?? null
    }));

    return {
      output: {
        rawData: result.data,
        pagination: result.pagination,
        coins,
        totalCoins: data.stats.total
      },
      message: `Found **${coins.length}** coin(s) (${data.stats.total} total).`
    };
  })
  .build();
