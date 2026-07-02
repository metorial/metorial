import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoinrankingClient } from '../lib/client';
import { spec } from '../spec';

export let getCoinDetails = SlateTool.create(spec, {
  name: 'Get Coin Details',
  key: 'get_coin_details',
  description: `Retrieve comprehensive information about a specific cryptocurrency including price, market cap, supply, rank, all-time high, social links, and description. Use the **search** tool first if you need to find a coin's UUID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      coinUuid: z.string().describe('UUID of the coin to retrieve details for'),
      referenceCurrencyUuid: z
        .string()
        .optional()
        .describe('UUID of currency for price calculations'),
      timePeriod: z
        .enum(['1h', '3h', '12h', '24h', '7d', '30d', '3m', '1y', '3y', '5y'])
        .optional()
        .describe('Time period for change calculation and sparkline data')
    })
  )
  .output(
    z.object({
      coinUuid: z.string().describe('Unique identifier of the coin'),
      symbol: z.string().describe('Ticker symbol'),
      name: z.string().describe('Full name'),
      description: z.string().nullable().describe('Description of the coin'),
      color: z.string().nullable().describe('Brand color'),
      iconUrl: z.string().nullable().describe('URL of the coin icon'),
      websiteUrl: z.string().nullable().describe('Official website URL'),
      price: z.string().nullable().describe('Current price in reference currency'),
      btcPrice: z.string().nullable().describe('Price in Bitcoin'),
      marketCap: z.string().nullable().describe('Market capitalization'),
      fullyDilutedMarketCap: z.string().nullable().describe('Fully diluted market cap'),
      volume24h: z.string().nullable().describe('24-hour trading volume'),
      change: z
        .string()
        .nullable()
        .describe('Price change percentage over the selected time period'),
      rank: z.number().nullable().describe('Rank by market cap'),
      numberOfMarkets: z
        .number()
        .nullable()
        .describe('Number of markets the coin is traded on'),
      numberOfExchanges: z
        .number()
        .nullable()
        .describe('Number of exchanges the coin is listed on'),
      supply: z
        .object({
          confirmed: z.boolean().nullable().describe('Whether the supply is confirmed'),
          supplyAt: z.number().nullable().describe('Timestamp when supply was last updated'),
          circulating: z.string().nullable().describe('Circulating supply'),
          total: z.string().nullable().describe('Total supply'),
          max: z.string().nullable().describe('Maximum supply')
        })
        .describe('Supply information'),
      allTimeHigh: z
        .object({
          price: z.string().nullable().describe('All-time high price'),
          timestamp: z.number().nullable().describe('Epoch timestamp of all-time high')
        })
        .describe('All-time high data'),
      links: z
        .array(
          z.object({
            name: z.string().describe('Link label'),
            url: z.string().describe('Link URL'),
            type: z.string().describe('Link type (e.g. website, twitter, reddit)')
          })
        )
        .describe('Social and informational links'),
      tags: z.array(z.string()).describe('Tags/categories the coin belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoinrankingClient({
      token: ctx.auth.token,
      referenceCurrencyUuid: ctx.config.referenceCurrencyUuid
    });

    let result = await client.getCoin({
      coinUuid: ctx.input.coinUuid,
      referenceCurrencyUuid: ctx.input.referenceCurrencyUuid,
      timePeriod: ctx.input.timePeriod
    });

    let coin = result.data.coin;

    let output = {
      coinUuid: coin.uuid,
      symbol: coin.symbol,
      name: coin.name,
      description: coin.description || null,
      color: coin.color || null,
      iconUrl: coin.iconUrl || null,
      websiteUrl: coin.websiteUrl || null,
      price: coin.price || null,
      btcPrice: coin.btcPrice || null,
      marketCap: coin.marketCap || null,
      fullyDilutedMarketCap: coin.fullyDilutedMarketCap || null,
      volume24h: coin['24hVolume'] || null,
      change: coin.change || null,
      rank: coin.rank ?? null,
      numberOfMarkets: coin.numberOfMarkets ?? null,
      numberOfExchanges: coin.numberOfExchanges ?? null,
      supply: {
        confirmed: coin.supply?.confirmed ?? null,
        supplyAt: coin.supply?.supplyAt ?? null,
        circulating: coin.supply?.circulating || null,
        total: coin.supply?.total || null,
        max: coin.supply?.max || null
      },
      allTimeHigh: {
        price: coin.allTimeHigh?.price || null,
        timestamp: coin.allTimeHigh?.timestamp ?? null
      },
      links: (coin.links || []).map((l: any) => ({
        name: l.name || '',
        url: l.url || '',
        type: l.type || ''
      })),
      tags: (coin.tags || []).map((t: any) => (typeof t === 'string' ? t : t.name || ''))
    };

    return {
      output,
      message: `**${coin.name}** (${coin.symbol}) — Price: ${coin.price || 'N/A'}, Rank: #${coin.rank || 'N/A'}, Market Cap: ${coin.marketCap || 'N/A'}, Change: ${coin.change || 'N/A'}%`
    };
  })
  .build();
