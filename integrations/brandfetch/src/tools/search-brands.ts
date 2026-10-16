import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SearchClient } from '../lib/client';
import { spec } from '../spec';

export let searchBrands = SlateTool.create(spec, {
  name: 'Search Brands',
  key: 'search_brands',
  description: `Search for brands by name and get matching brand domains and logo icons. Useful for building autocomplete experiences or finding brands when you only know the name.
Returns lightweight results with brand IDs, names, domains, and icon URLs. Use **Get Brand** for full brand data after identifying the target brand.`,
  instructions: [
    'Logo image URLs from search results expire after 24 hours and must be refetched.',
    'Requires a Client ID to be configured in authentication.'
  ],
  constraints: [
    'Rate limited to 200 requests per 5 minutes per IP address.',
    'Up to 500,000 requests/month under fair use.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Brand name to search for, e.g. "Nike", "Apple"')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            brandId: z.string().describe('Unique brand identifier'),
            brandName: z.string().optional().describe('Brand name when provided'),
            domain: z.string().describe('Brand domain'),
            iconUrl: z
              .string()
              .optional()
              .describe('URL to the brand icon when provided (expires after 24 hours)'),
            claimed: z.boolean().describe('Whether the brand has been claimed by its owner')
          })
        )
        .describe('Matching brand results'),
      raw: z
        .array(z.unknown())
        .optional()
        .describe(
          'Complete original search results, preserving provider metadata and null values'
        )
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.clientId?.trim()) {
      throw createApiServiceError(
        'Client ID is required for Brand Search. Please configure your Brandfetch Client ID in the authentication settings.'
      );
    }

    let client = new SearchClient(ctx.auth.clientId);
    let results = await client.searchBrands(ctx.input.query);

    return {
      output: {
        results: results.map(r => ({
          brandId: r.brandId,
          brandName: r.name ?? undefined,
          domain: r.domain,
          iconUrl: r.icon ?? undefined,
          claimed: r.claimed
        })),
        raw: results
      },
      message: `Found **${results.length}** brand(s) matching "${ctx.input.query}".${results.length > 0 ? ` Top result: **${results[0]!.name ?? results[0]!.domain}** (${results[0]!.domain}).` : ''}`
    };
  })
  .build();
