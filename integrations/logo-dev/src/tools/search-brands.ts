import { SlateTool } from 'slates';
import { z } from 'zod';
import { LogoDevClient } from '../lib/client';
import { metadataSchema } from '../lib/schemas';
import { spec } from '../spec';

export let searchBrands = SlateTool.create(spec, {
  name: 'Search Brands',
  key: 'search_brands',
  description: `Search for companies by brand name. Returns matching names, domains, and logo URLs. Supports typeahead for partial input and match for full company names. Returns 10 results by default, or up to 25 with limit.`,
  constraints: [
    'Returns a maximum of 25 results per query and consumes API credits.',
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
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(25)
        .optional()
        .describe('Maximum number of results, from 1 to 25. Defaults to 10.')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            name: z.string().describe('Company or brand name.'),
            domain: z.string().describe('Company domain.'),
            logoUrl: z.string().optional().describe('Logo CDN URL for displaying the brand.')
          })
        )
        .describe('List of matching brands sorted by popularity.'),
      totalResults: z.number().describe('Number of results returned.'),
      metadata: metadataSchema.optional().describe('Provider request metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LogoDevClient(ctx.auth.token);
    let response = await client.searchBrands(
      ctx.input.query,
      ctx.input.strategy,
      ctx.input.limit
    );
    let results = response.data.map(result => ({
      name: result.name,
      domain: result.domain,
      logoUrl: result.logo_url
    }));

    return {
      output: {
        results,
        totalResults: results.length,
        metadata: response.metadata
      },
      message: `Found **${results.length}** brand(s) matching "${ctx.input.query}"${results.length > 0 ? `: ${results.map(r => `${r.name} (${r.domain})`).join(', ')}` : '.'}`
    };
  })
  .build();
