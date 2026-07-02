import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrustdataClient } from '../lib/client';
import { spec } from '../spec';

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Search for real-time public information using Crustdata's AI-optimized web search.
Returns structured, entity-linked results from the web including press releases, blog posts, podcast appearances, funding news, and product launches.
Results are returned as structured JSON suitable for direct integration into AI workflows.`,
  instructions: [
    'Query is limited to 1000 characters.',
    'Use the sources parameter to filter by content type (news, web, scholar-articles, etc.).',
    'Use the site parameter to restrict results to a specific domain.',
    'Enable fetchContent to get the full HTML content of each search result.'
  ],
  constraints: [
    'Rate limited to 15 requests per minute.',
    'Query max length: 1000 characters.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query (max 1000 characters).'),
      geolocation: z
        .string()
        .optional()
        .describe(
          'ISO 3166-1 alpha-2 country code for geographic filtering (e.g., "US", "GB").'
        ),
      sources: z
        .array(
          z.enum([
            'news',
            'web',
            'scholar-articles',
            'scholar-articles-enriched',
            'scholar-author'
          ])
        )
        .optional()
        .describe('Content sources to search.'),
      site: z.string().optional().describe('Restrict results to a specific domain.'),
      startDate: z.number().optional().describe('Start date as Unix timestamp.'),
      endDate: z.number().optional().describe('End date as Unix timestamp.'),
      fetchContent: z
        .boolean()
        .optional()
        .describe('Retrieve full HTML content for each result.')
    })
  )
  .output(
    z.object({
      query: z.string().optional().describe('The original search query.'),
      results: z
        .array(
          z.object({
            title: z.string().optional().describe('Title of the search result.'),
            url: z.string().optional().describe('URL of the search result.'),
            snippet: z.string().optional().describe('Text snippet from the result.'),
            position: z.number().optional().describe('Position in search results.')
          })
        )
        .describe('Array of search results.'),
      totalResults: z.number().optional().describe('Total number of results found.'),
      contents: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Fetched content for each result (when fetchContent is enabled).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CrustdataClient(ctx.auth.token);

    let result = await client.webSearch({
      query: ctx.input.query,
      geolocation: ctx.input.geolocation,
      sources: ctx.input.sources,
      site: ctx.input.site,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      fetchContent: ctx.input.fetchContent
    });

    let results = result.results ?? [];
    let totalResults = result.metadata?.totalResults;

    return {
      output: {
        query: result.query ?? result.sanitizedQuery,
        results,
        totalResults,
        contents: result.contents
      },
      message: `Found **${results.length}** web search results for "${ctx.input.query}".`
    };
  })
  .build();
