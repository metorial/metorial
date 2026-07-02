import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoinrankingClient } from '../lib/client';
import { spec } from '../spec';

let trendingCoinSchema = z.object({
  coinUuid: z.string().describe('Unique identifier of the coin'),
  symbol: z.string().describe('Ticker symbol'),
  name: z.string().describe('Full name'),
  iconUrl: z.string().nullable().describe('URL of the coin icon'),
  price: z.string().nullable().describe('Current price'),
  marketCap: z.string().nullable().describe('Market capitalization'),
  volume24h: z.string().nullable().describe('24-hour trading volume'),
  change: z.string().nullable().describe('Price change percentage'),
  rank: z.number().nullable().describe('Rank by market cap'),
  btcPrice: z.string().nullable().describe('Price in Bitcoin')
});

export let getTrendingCoins = SlateTool.create(spec, {
  name: 'Get Trending Coins',
  key: 'get_trending_coins',
  description: `Get a list of currently trending cryptocurrencies based on user engagement and popularity on Coinranking. Results can be filtered by tier and paginated.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      referenceCurrencyUuid: z
        .string()
        .optional()
        .describe('UUID of currency for price calculations'),
      timePeriod: z
        .enum(['1h', '3h', '12h', '24h', '7d', '30d', '3m', '1y', '3y', '5y'])
        .optional()
        .describe('Time period for change calculation'),
      tiers: z
        .array(z.enum(['1', '2', '3']))
        .optional()
        .describe('Filter by coin quality tiers (1 = highest quality)'),
      limit: z
        .number()
        .optional()
        .describe('Number of results to return (max 100 for free plan)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      coins: z.array(trendingCoinSchema).describe('List of trending coins'),
      totalCoins: z.number().describe('Total number of trending coins available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinrankingClient({
      token: ctx.auth.token,
      referenceCurrencyUuid: ctx.config.referenceCurrencyUuid
    });

    let result = await client.getTrendingCoins({
      referenceCurrencyUuid: ctx.input.referenceCurrencyUuid,
      timePeriod: ctx.input.timePeriod,
      tiers: ctx.input.tiers,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let data = result.data;
    let coins = (data.coins || []).map((c: any) => ({
      coinUuid: c.uuid,
      symbol: c.symbol,
      name: c.name,
      iconUrl: c.iconUrl || null,
      price: c.price || null,
      marketCap: c.marketCap || null,
      volume24h: c['24hVolume'] || null,
      change: c.change || null,
      rank: c.rank ?? null,
      btcPrice: c.btcPrice || null
    }));

    return {
      output: {
        coins,
        totalCoins: data.stats?.total ?? coins.length
      },
      message: `Retrieved **${coins.length}** trending coin(s).`
    };
  })
  .build();
