import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchSite = SlateTool.create(spec, {
  name: 'Search Site',
  key: 'search_site',
  description: `Search the published website using DatoCMS built-in site search. Returns matching pages with titles, URLs, body excerpts, and relevance scores. Requires an enabled search index.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      searchIndexId: z
        .string()
        .optional()
        .describe(
          'Search index ID. Omit to use the first enabled search index. Do not combine with buildTriggerId.'
        ),
      buildTriggerId: z
        .string()
        .optional()
        .describe(
          'Legacy build trigger ID for sites with one associated search index; prefer searchIndexId'
        ),
      locale: z.string().optional().describe('Locale to filter results (e.g. "en")'),
      fuzzy: z.boolean().optional().describe('Enable fuzzy matching for approximate results'),
      pageOffset: z.number().optional().describe('Zero-based offset for pagination'),
      pageLimit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      results: z.array(z.any()).describe('Array of search result objects'),
      totalCount: z.number().describe('Total number of matching results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.searchSite(ctx.input.query, {
      buildTriggerId: ctx.input.buildTriggerId,
      searchIndexId: ctx.input.searchIndexId,
      locale: ctx.input.locale,
      fuzzy: ctx.input.fuzzy,
      pageOffset: ctx.input.pageOffset,
      pageLimit: ctx.input.pageLimit
    });

    return {
      output: {
        results: result.data,
        totalCount: result.totalCount
      },
      message: `Found **${result.totalCount}** search results for "${ctx.input.query}" (returned ${result.data.length} in this page).`
    };
  })
  .build();
