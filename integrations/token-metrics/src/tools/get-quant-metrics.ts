import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getQuantMetrics = SlateTool.create(spec, {
  name: 'Get Quantitative Metrics',
  key: 'get_quant_metrics',
  description: `Retrieve quantitative risk and performance metrics for tokens including volatility, Sharpe ratio, Sortino ratio, max drawdown, CAGR, all-time return, skew, kurtosis, tail ratio, risk-reward ratio, profit factor, and daily value at risk.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tokenId: z.string().optional().describe('Comma-separated Token Metrics IDs'),
      symbol: z.string().optional().describe('Comma-separated token symbols, e.g. "BTC,ETH"'),
      category: z.string().optional().describe('Comma-separated categories to filter by'),
      exchange: z.string().optional().describe('Comma-separated exchanges to filter by'),
      minMarketCap: z.number().optional().describe('Minimum market cap in USD'),
      minVolume: z.number().optional().describe('Minimum 24h trading volume in USD'),
      minFdv: z.number().optional().describe('Minimum fully diluted valuation in USD'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      quantMetrics: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of quantitative metric records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getQuantMetrics({
      tokenId: ctx.input.tokenId,
      symbol: ctx.input.symbol,
      category: ctx.input.category,
      exchange: ctx.input.exchange,
      marketcap: ctx.input.minMarketCap,
      volume: ctx.input.minVolume,
      fdv: ctx.input.minFdv,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let quantMetrics = result?.data ?? [];

    return {
      output: { quantMetrics },
      message: `Retrieved **${quantMetrics.length}** quantitative metric record(s).`
    };
  })
  .build();
