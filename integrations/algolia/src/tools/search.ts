import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

let searchOutputSchema = z.object({
  hits: z.array(z.any()).describe('Array of hit objects matching the query'),
  nbHits: z.number().optional().describe('Total number of matching hits'),
  page: z.number().optional().describe('Current page number (0-based)'),
  nbPages: z.number().optional().describe('Total number of pages'),
  hitsPerPage: z.number().optional().describe('Number of hits per page'),
  processingTimeMs: z.number().optional().describe('Query processing time in milliseconds'),
  query: z.string().optional().describe('The query text that was searched, when returned'),
  facets: z
    .any()
    .optional()
    .describe('Facet counts per attribute (object of attribute -> value -> count)'),
  exhaustiveNbHits: z
    .boolean()
    .optional()
    .describe('Whether the hit count is exhaustive or approximate, when returned'),
  params: z
    .string()
    .optional()
    .describe('URL-encoded query parameters used for the search, when returned'),
  queryId: z
    .string()
    .optional()
    .describe('Query ID for send_events when clickAnalytics is true.'),
  raw: z.any().optional().describe('Complete search response, including additional metadata.')
});

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
        .describe('Whether to include this query in analytics (default: true)'),
      clickAnalytics: z
        .boolean()
        .optional()
        .describe('Set true to return queryId for after-search click and conversion events.'),
      userToken: z
        .string()
        .optional()
        .describe('User identifier for personalization and analytics.'),
      analyticsTags: z.array(z.string()).optional().describe('Tags for filtering analytics.'),
      facetFilters: z
        .array(z.union([z.string(), z.array(z.string())]))
        .optional()
        .describe('Facet filters. Nested arrays combine alternatives with OR.')
    })
  )
  .output(searchOutputSchema)
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

    let exhaustive = result?.exhaustive;
    if (
      exhaustive !== undefined &&
      (typeof exhaustive !== 'object' || exhaustive === null || Array.isArray(exhaustive))
    ) {
      throw createApiServiceError('Algolia returned invalid search exhaustiveness metadata.', {
        reason: 'algolia_invalid_response'
      });
    }
    let normalized = searchOutputSchema.safeParse({
      hits: result?.hits,
      nbHits: result?.nbHits,
      page: result?.page,
      nbPages: result?.nbPages,
      hitsPerPage: result?.hitsPerPage,
      processingTimeMs: result?.processingTimeMS,
      query: result?.query,
      facets: result?.facets,
      exhaustiveNbHits:
        result?.exhaustiveNbHits !== undefined ? result.exhaustiveNbHits : exhaustive?.nbHits,
      params: result?.params,
      queryId: result?.queryID,
      raw: result
    });
    if (!normalized.success) {
      throw createApiServiceError(
        'Algolia returned an invalid search response. Ensure the index responseFields includes hits and that returned search metadata has the documented types.',
        { reason: 'algolia_invalid_response' }
      );
    }
    let output = normalized.data;
    let summary =
      output.nbHits !== undefined
        ? `Found **${output.nbHits}** hits`
        : `Retrieved **${output.hits.length}** hits`;
    let pagination =
      output.page !== undefined && output.nbPages !== undefined
        ? ` (page ${output.page + 1} of ${output.nbPages})`
        : '';

    return {
      output,
      message: `${summary} for "${query}" in index "${indexName}"${pagination}.`
    };
  })
  .build();
