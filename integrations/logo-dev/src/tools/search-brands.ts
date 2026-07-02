import { SlateTool } from 'slates';
import { z } from 'zod';
import { LogoDevClient } from '../lib/client';
import { spec } from '../spec';

export let searchBrands = SlateTool.create(spec, {
  name: 'Search Brands',
  key: 'search_brands',
  description: `Search for companies by brand name. Returns up to 10 matching results sorted by popularity, each with a company name and domain. Supports **typeahead** (prefix-forward matching, ideal for autocomplete) and **match** (exact/near-exact name matching) strategies.`,
  constraints: [
    'Returns a maximum of 10 results per query.',
    'Requires a secret key (sk_...).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Brand name to search for.'),
      strategy: z
        .enum(['typeahead', 'match'])
        .optional()
        .describe(
          'Search strategy. "typeahead" for prefix-forward matching (default, best for autocomplete), "match" for exact/near-exact name matching.'
        )
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            name: z.string().describe('Company or brand name.'),
            domain: z.string().describe('Company domain.')
          })
        )
        .describe('List of matching brands sorted by popularity.'),
      totalResults: z.number().describe('Number of results returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LogoDevClient(ctx.auth.token);
    let results = await client.searchBrands(ctx.input.query, ctx.input.strategy);

    return {
      output: {
        results,
        totalResults: results.length
      },
      message: `Found **${results.length}** brand(s) matching "${ctx.input.query}"${results.length > 0 ? `: ${results.map(r => `${r.name} (${r.domain})`).join(', ')}` : '.'}`
    };
  })
  .build();
