import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchSymbol = SlateTool.create(spec, {
  name: 'Search Symbol',
  key: 'search_symbol',
  description: `Search for ticker symbols by keyword. Returns matching symbols with their name, type, region, market hours, currency, and a match score. Use this to look up ticker symbols when you know the company name but not the exact symbol.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keywords: z
        .string()
        .describe('Search keywords, e.g. company name or partial ticker symbol')
    })
  )
  .output(
    z.object({
      matches: z
        .array(
          z.object({
            symbol: z.string().describe('Ticker symbol'),
            name: z.string().describe('Company or instrument name'),
            type: z.string().describe('Instrument type, e.g. Equity, ETF'),
            region: z.string().describe('Market region'),
            marketOpen: z.string().describe('Market opening time'),
            marketClose: z.string().describe('Market closing time'),
            timezone: z.string().describe('Timezone of the market'),
            currency: z.string().describe('Trading currency'),
            matchScore: z.string().describe('Relevance score of the match (0.0 to 1.0)')
          })
        )
        .describe('Matching symbols sorted by relevance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let data = await client.symbolSearch({ keywords: ctx.input.keywords });
    let bestMatches = data.bestMatches || [];

    let matches = bestMatches.map((m: any) => ({
      symbol: m['1. symbol'] || '',
      name: m['2. name'] || '',
      type: m['3. type'] || '',
      region: m['4. region'] || '',
      marketOpen: m['5. marketOpen'] || '',
      marketClose: m['6. marketClose'] || '',
      timezone: m['7. timezone'] || '',
      currency: m['8. currency'] || '',
      matchScore: m['9. matchScore'] || ''
    }));

    return {
      output: { matches },
      message: `Found ${matches.length} matching symbol(s) for "${ctx.input.keywords}".`
    };
  })
  .build();
