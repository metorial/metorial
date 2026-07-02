import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

let searchResultSchema = z.object({
  Code: z.string().describe('Ticker symbol'),
  Exchange: z.string().describe('Exchange code'),
  Name: z.string().describe('Full instrument name'),
  Type: z.string().describe('Asset type (e.g., Common Stock, ETF)'),
  Country: z.string().describe('Country of exchange'),
  Currency: z.string().describe('Trading currency'),
  ISIN: z.string().optional().nullable().describe('ISIN identifier'),
  previousClose: z.number().optional().nullable().describe('Previous closing price'),
  previousCloseDate: z.string().optional().nullable().describe('Date of previous close')
});

export let searchInstruments = SlateTool.create(spec, {
  name: 'Search Instruments',
  key: 'search_instruments',
  description: `Search for stocks, ETFs, mutual funds, bonds, and indices by name, ticker symbol, or ISIN. Returns matching instruments with their exchange, type, currency, and last closing price.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query: ticker symbol, company name, or ISIN'),
      limit: z.number().optional().describe('Max number of results (default: 15, max: 500)'),
      type: z
        .enum(['stock', 'etf', 'fund', 'bond', 'index', 'crypto', 'all'])
        .optional()
        .describe('Filter by asset type'),
      exchange: z
        .string()
        .optional()
        .describe('Filter by exchange code, e.g., US, NASDAQ, NYSE')
    })
  )
  .output(
    z.object({
      results: z.array(searchResultSchema).describe('Matching instruments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });

    let results = await client.searchInstruments(ctx.input.query, {
      limit: ctx.input.limit,
      type: ctx.input.type,
      exchange: ctx.input.exchange
    });

    let resultsArray = Array.isArray(results) ? results : [];

    return {
      output: {
        results: resultsArray
      },
      message: `Found **${resultsArray.length}** instruments matching "${ctx.input.query}".`
    };
  })
  .build();
