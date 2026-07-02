import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { spec } from '../spec';

export let searchMarket = SlateTool.create(spec, {
  name: 'Search Market Symbols',
  key: 'search_market',
  description: `Search for stock symbols by company name or description across different markets. Also retrieves current market status for major exchanges. Useful for symbol lookup and verifying market hours.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search keyword (company name, ticker, or description)'),
      market: z
        .enum(['us', 'uk', 'de', 'ca', 'jp', 'hk', 'in', 'au', 'fr', 'kr'])
        .default('us')
        .describe('Market to search in'),
      limit: z.number().default(10).describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            symbol: z.string().optional().describe('Ticker symbol'),
            description: z.string().optional().describe('Company name or description'),
            exchangeType: z.string().optional().describe('Exchange type')
          })
        )
        .describe('Matching symbols')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let { query, market, limit } = ctx.input;

    let data = await client.searchMarket(market, query, limit);

    let rawResults = Array.isArray(data) ? data : data?.results || [];
    let results = rawResults.map((r: any) => ({
      symbol: r.symbol,
      description: r.description ?? r.name,
      exchangeType: r.s_type ?? r.exchange
    }));

    return {
      output: { results },
      message: `Found **${results.length}** results for "${query}" in the ${market.toUpperCase()} market.`
    };
  })
  .build();
