import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

export let search = SlateTool.create(spec, {
  name: 'Search Index',
  key: 'search',
  description: `Search an Algolia index with a query string and optional search parameters. Returns matching hits with highlighting, facet counts, pagination info, and other search metadata.
Supports filtering, faceting, typo tolerance, attribute selection, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      indexName: z.string().describe('Name of the Algolia index to search'),
      query: z.string().describe('Search query text'),
      hitsPerPage: z
        .number()
        .optional()
        .describe('Number of hits per page (default: 20, max: 1000)'),
      page: z.number().optional().describe('Page number to retrieve (0-based)'),
      filters: z
        .string()
        .optional()
        .describe(
          'Filter expression using Algolia filter syntax (e.g., "category:Books AND price < 20")'
        ),
      facets: z
        .array(z.string())
        .optional()
        .describe(
          'List of facet attributes to retrieve counts for (use ["*"] for all facets)'
        ),
      attributesToRetrieve: z
        .array(z.string())
        .optional()
        .describe(
          'Attributes to include in returned hits (default: all). Use ["*"] for all attributes.'
        ),
      attributesToHighlight: z
        .array(z.string())
        .optional()
        .describe(
          'Attributes to highlight in results. Use ["*"] for all searchable attributes.'
        ),
      typoTolerance: z
        .enum(['true', 'false', 'min', 'strict'])
        .optional()
        .describe(
          'Typo tolerance mode: "true" (default), "false" (disabled), "min" (1 typo minimum), "strict" (allow typos on min-length words)'
        ),
      aroundLatLng: z
        .string()
        .optional()
        .describe(
          'Geo search: latitude,longitude for proximity sorting (e.g., "48.8566,2.3522")'
        ),
      aroundRadius: z
        .number()
        .optional()
        .describe('Maximum radius in meters for geo search (use with aroundLatLng)'),
      optionalFilters: z
        .array(z.string())
        .optional()
        .describe(
          'Optional filter expressions to boost matching hits without excluding non-matching ones'
        ),
      numericFilters: z
        .array(z.string())
        .optional()
        .describe('Numeric filter expressions (e.g., ["price > 10", "rating >= 4"])'),
      tagFilters: z
        .array(z.union([z.string(), z.array(z.string())]))
        .optional()
        .describe('Tag filter expressions for filtering by _tags attribute'),
      distinct: z
        .number()
        .optional()
        .describe(
          'De-duplication level (0 to disable, 1+ for distinct results based on attributeForDistinct)'
        ),
      analytics: z
        .boolean()
        .optional()
        .describe('Whether to include this query in analytics (default: true)')
    })
  )
  .output(
    z.object({
      hits: z.array(z.any()).describe('Array of hit objects matching the query'),
      nbHits: z.number().describe('Total number of matching hits'),
      page: z.number().describe('Current page number (0-based)'),
      nbPages: z.number().describe('Total number of pages'),
      hitsPerPage: z.number().describe('Number of hits per page'),
      processingTimeMs: z.number().describe('Query processing time in milliseconds'),
      query: z.string().describe('The query text that was searched'),
      facets: z
        .any()
        .optional()
        .describe('Facet counts per attribute (object of attribute -> value -> count)'),
      exhaustiveNbHits: z
        .boolean()
        .describe('Whether the hit count is exhaustive or approximate'),
      params: z.string().describe('URL-encoded query parameters used for the search')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlgoliaClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      analyticsRegion: ctx.config.analyticsRegion
    });

    let { indexName, query, ...searchParams } = ctx.input;

    let params: Record<string, any> = {
      query,
      ...searchParams
    };

    // Convert typoTolerance string to appropriate type
    if (params.typoTolerance !== undefined) {
      if (params.typoTolerance === 'true') params.typoTolerance = true;
      else if (params.typoTolerance === 'false') params.typoTolerance = false;
    }

    let result = await client.search(indexName, params);

    return {
      output: {
        hits: result.hits || [],
        nbHits: result.nbHits ?? 0,
        page: result.page ?? 0,
        nbPages: result.nbPages ?? 0,
        hitsPerPage: result.hitsPerPage ?? 20,
        processingTimeMs: result.processingTimeMS ?? 0,
        query: result.query ?? query,
        facets: result.facets,
        exhaustiveNbHits: result.exhaustiveNbHits ?? true,
        params: result.params ?? ''
      },
      message: `Found **${result.nbHits ?? 0}** hits for "${query}" in index "${indexName}" (page ${(result.page ?? 0) + 1} of ${result.nbPages ?? 1}).`
    };
  })
  .build();
