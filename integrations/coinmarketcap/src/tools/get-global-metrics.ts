import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let globalQuoteSchema = z.object({
  totalMarketCap: z.number().nullable().describe('Total cryptocurrency market capitalization'),
  totalVolume24h: z.number().nullable().describe('Total 24-hour trading volume'),
  totalVolume24hReported: z
    .number()
    .nullable()
    .describe('Total 24-hour reported trading volume'),
  altcoinVolume24h: z.number().nullable().describe('Altcoin 24-hour trading volume'),
  altcoinMarketCap: z.number().nullable().describe('Altcoin market capitalization'),
  defiVolume24h: z.number().nullable().describe('DeFi 24-hour trading volume'),
  defiMarketCap: z.number().nullable().describe('DeFi market capitalization'),
  stablecoinVolume24h: z.number().nullable().describe('Stablecoin 24-hour trading volume'),
  stablecoinMarketCap: z.number().nullable().describe('Stablecoin market capitalization'),
  derivativesVolume24h: z.number().nullable().describe('Derivatives 24-hour trading volume'),
  lastUpdated: z.string().nullable().describe('Last updated timestamp')
});

let globalMetricsSchema = z.object({
  activeCryptocurrencies: z.number().describe('Number of active cryptocurrencies'),
  totalCryptocurrencies: z.number().describe('Total number of cryptocurrencies'),
  activeMarketPairs: z.number().describe('Number of active market pairs'),
  activeExchanges: z.number().describe('Number of active exchanges'),
  totalExchanges: z.number().describe('Total number of exchanges'),
  ethDominance: z.number().describe('Ethereum market dominance percentage'),
  btcDominance: z.number().describe('Bitcoin market dominance percentage'),
  ethDominanceYesterday: z.number().describe('Ethereum dominance from yesterday'),
  btcDominanceYesterday: z.number().describe('Bitcoin dominance from yesterday'),
  defiVolume24h: z.number().describe('DeFi 24-hour volume in USD'),
  defiMarketCap: z.number().describe('DeFi total market cap in USD'),
  stablecoinVolume24h: z.number().describe('Stablecoin 24-hour volume in USD'),
  stablecoinMarketCap: z.number().describe('Stablecoin total market cap in USD'),
  derivativesVolume24h: z.number().describe('Derivatives 24-hour volume in USD'),
  lastUpdated: z.string().describe('Last updated timestamp'),
  quote: z
    .record(z.string(), globalQuoteSchema)
    .describe('Global market metrics in the requested currency')
});

export let getGlobalMetrics = SlateTool.create(spec, {
  name: 'Get Global Metrics',
  key: 'get_global_metrics',
  description: `Retrieve the latest aggregate cryptocurrency market metrics including total market capitalization, total 24-hour volume, Bitcoin/Ethereum dominance, and DeFi/stablecoin/derivatives breakdowns.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      convert: z
        .string()
        .optional()
        .describe('Currency to quote metrics in (e.g., "USD", "EUR"). Default: USD')
    })
  )
  .output(globalMetricsSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let metrics = await client.getGlobalMetricsLatest({
      convert: ctx.input.convert
    });

    let currency = ctx.input.convert || 'USD';
    let q = metrics.quote?.[currency];
    let totalMcap = q?.totalMarketCap;
    let formattedMcap = totalMcap ? `$${(totalMcap / 1e12).toFixed(2)}T` : 'N/A';

    return {
      output: metrics,
      message: `Global crypto market: **${formattedMcap}** total market cap, **${metrics.activeCryptocurrencies}** active cryptocurrencies, BTC dominance: **${metrics.btcDominance.toFixed(1)}%**, ETH dominance: **${metrics.ethDominance.toFixed(1)}%**.`
    };
  })
  .build();
