import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoinrankingClient } from '../lib/client';
import { spec } from '../spec';

export let getGlobalStats = SlateTool.create(spec, {
  name: 'Get Global Stats',
  key: 'get_global_stats',
  description: `Retrieve aggregated cryptocurrency market statistics including total market cap, 24-hour volume, total number of coins, and number of exchanges. Also includes BTC dominance and best/newest coin highlights.`,
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
        .describe('UUID of currency for value calculations')
    })
  )
  .output(
    z.object({
      totalCoins: z.number().describe('Total number of coins'),
      totalMarkets: z.number().describe('Total number of markets'),
      totalExchanges: z.number().describe('Total number of exchanges'),
      totalMarketCap: z.string().describe('Total market capitalization'),
      total24hVolume: z.string().describe('Total 24-hour trading volume'),
      btcDominance: z.number().describe('Bitcoin dominance percentage'),
      bestCoins: z
        .array(
          z.object({
            coinUuid: z.string().describe('UUID of the coin'),
            symbol: z.string().describe('Ticker symbol'),
            name: z.string().describe('Full name'),
            iconUrl: z.string().nullable().describe('URL of the coin icon')
          })
        )
        .describe('Top performing coins'),
      newestCoins: z
        .array(
          z.object({
            coinUuid: z.string().describe('UUID of the coin'),
            symbol: z.string().describe('Ticker symbol'),
            name: z.string().describe('Full name'),
            iconUrl: z.string().nullable().describe('URL of the coin icon')
          })
        )
        .describe('Most recently listed coins')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinrankingClient({
      token: ctx.auth.token,
      referenceCurrencyUuid: ctx.config.referenceCurrencyUuid
    });

    let result = await client.getGlobalStats({
      referenceCurrencyUuid: ctx.input.referenceCurrencyUuid
    });

    let stats = result.data;

    let mapCoinSummary = (c: any) => ({
      coinUuid: c.uuid,
      symbol: c.symbol,
      name: c.name,
      iconUrl: c.iconUrl || null
    });

    return {
      output: {
        totalCoins: stats.totalCoins,
        totalMarkets: stats.totalMarkets,
        totalExchanges: stats.totalExchanges,
        totalMarketCap: stats.totalMarketCap,
        total24hVolume: stats.total24hVolume,
        btcDominance: stats.btcDominance,
        bestCoins: (stats.bestCoins || []).map(mapCoinSummary),
        newestCoins: (stats.newestCoins || []).map(mapCoinSummary)
      },
      message: `**Global Crypto Stats** — Total market cap: ${stats.totalMarketCap}, 24h volume: ${stats.total24hVolume}, Coins: ${stats.totalCoins}, BTC dominance: ${stats.btcDominance}%`
    };
  })
  .build();
