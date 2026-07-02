import { SlateTool } from 'slates';
import { z } from 'zod';
import { HyperbrowserClient } from '../lib/client';
import { webSearchResultSchema } from '../lib/schemas';
import { spec } from '../spec';

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Search the web using Bing and get structured search results.
Returns titles, URLs, and descriptions for matching web pages. Supports advanced filtering by file type, site, date, and geographic location.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      page: z.number().optional().describe('Page number for pagination'),
      maxAgeSeconds: z.number().optional().describe('Maximum age of results in seconds'),
      location: z
        .object({
          country: z.string().optional().describe('Country code for location-based search'),
          state: z.string().optional().describe('US state abbreviation'),
          city: z.string().optional().describe('City name')
        })
        .optional()
        .describe('Geographic location filter'),
      filters: z
        .object({
          exactPhrase: z.string().optional().describe('Exact phrase to match'),
          semanticPhrase: z
            .string()
            .optional()
            .describe('Semantic phrase for broader matching'),
          excludeTerms: z
            .array(z.string())
            .optional()
            .describe('Terms to exclude from results'),
          boostTerms: z
            .array(z.string())
            .optional()
            .describe('Terms to prioritize in results'),
          filetype: z
            .enum(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'html'])
            .optional()
            .describe('Filter by file type'),
          site: z
            .string()
            .optional()
            .describe('Limit results to a specific site (e.g., "example.com")'),
          excludeSite: z.string().optional().describe('Exclude results from a specific site'),
          intitle: z.string().optional().describe('Filter results by title content'),
          inurl: z.string().optional().describe('Filter results by URL content')
        })
        .optional()
        .describe('Advanced search filters')
    })
  )
  .output(
    z.object({
      query: z.string().optional().describe('Original search query'),
      results: z.array(webSearchResultSchema).describe('Search results'),
      status: z.string().optional().describe('Search job status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });

    let params: Record<string, unknown> = { query: ctx.input.query };
    if (ctx.input.page !== undefined) params.page = ctx.input.page;
    if (ctx.input.maxAgeSeconds !== undefined) params.maxAgeSeconds = ctx.input.maxAgeSeconds;
    if (ctx.input.location) params.location = ctx.input.location;
    if (ctx.input.filters) params.filters = ctx.input.filters;

    ctx.info(`Searching the web for "${ctx.input.query}"`);
    let result = await client.webSearch(params);

    let data = result.data as Record<string, unknown> | undefined;
    let searchResults = (data?.results ?? []) as Record<string, unknown>[];

    return {
      output: {
        query: data?.query as string | undefined,
        results: searchResults.map(r => ({
          title: r.title as string,
          url: r.url as string,
          description: r.description as string
        })),
        status: result.status as string | undefined
      },
      message: `Found **${searchResults.length}** results for "${ctx.input.query}".`
    };
  })
  .build();
