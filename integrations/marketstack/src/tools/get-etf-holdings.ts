import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEtfHoldings = SlateTool.create(spec, {
  name: 'Get ETF Holdings',
  key: 'get_etf_holdings',
  description: `Retrieve complete ETF holdings data by ticker, including fund metadata and individual security holdings with balances, values, weights, asset categories, and ISINs. Supports date range filtering.`,
  constraints: [
    'Available on Basic plan and higher',
    'Each ETF request counts as 20 API calls toward the provider quota.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('ETF ticker symbol (e.g. "SPY", "QQQ")'),
      dateFrom: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      dateTo: z.string().optional().describe('End date in YYYY-MM-DD format'),
      limit: z.number().optional().describe('Number of holdings to return (max 1000)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional(),
      pagination: z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        count: z.number().optional(),
        total: z.number().optional()
      }),
      fundSymbol: z.string(),
      fundName: z.string(),
      holdings: z.array(
        z.object({
          symbol: z.string().optional(),
          name: z.string(),
          balance: z.number().nullable(),
          value: z.number().nullable(),
          weight: z.number().nullable(),
          assetCategory: z.string().nullable(),
          isin: z.string().nullable(),
          date: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getEtfHoldings({
      symbol: ctx.input.symbol,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let holdings = (result.data.holdings || []).map(h => ({
      symbol: h.symbol,
      name: h.name,
      balance: h.balance,
      value: h.value,
      weight: h.weight,
      assetCategory: h.asset_category,
      isin: h.isin,
      date: h.date
    }));

    return {
      output: {
        pagination: result.pagination,
        raw: result.raw,
        fundSymbol: result.data.fund.symbol,
        fundName: result.data.fund.name,
        holdings
      },
      message: `Retrieved ${holdings.length} holdings for ETF **${ctx.input.symbol}** (${result.data.fund?.name ?? 'N/A'}).`
    };
  })
  .build();
