import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchTickers = SlateTool.create(spec, {
  name: 'Search Tickers',
  key: 'search_tickers',
  description: `Search for stock tickers by name, symbol, or exchange. Returns matching tickers with company name, symbol, country, and exchange information. Use this to find ticker symbols before querying price data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to match against ticker symbol or company name'),
      exchange: z
        .string()
        .optional()
        .describe('Filter by exchange MIC code (e.g. "XNAS" for NASDAQ)'),
      limit: z.number().optional().describe('Number of results to return (max 1000)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      pagination: z.object({
        limit: z.number(),
        offset: z.number(),
        count: z.number(),
        total: z.number()
      }),
      tickers: z.array(
        z.object({
          symbol: z.string(),
          name: z.string(),
          country: z.string().nullable(),
          hasIntraday: z.boolean(),
          hasEod: z.boolean(),
          exchange: z.object({
            name: z.string(),
            acronym: z.string(),
            mic: z.string(),
            country: z.string(),
            countryCode: z.string(),
            city: z.string()
          })
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTickers({
      search: ctx.input.search,
      exchange: ctx.input.exchange,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let tickers = result.data.map(t => ({
      symbol: t.symbol,
      name: t.name,
      country: t.country,
      hasIntraday: t.has_intraday,
      hasEod: t.has_eod,
      exchange: {
        name: t.stock_exchange.name,
        acronym: t.stock_exchange.acronym,
        mic: t.stock_exchange.mic,
        country: t.stock_exchange.country,
        countryCode: t.stock_exchange.country_code,
        city: t.stock_exchange.city
      }
    }));

    return {
      output: {
        pagination: result.pagination,
        tickers
      },
      message: `Found ${tickers.length} tickers${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}. Total available: ${result.pagination.total}.`
    };
  })
  .build();
