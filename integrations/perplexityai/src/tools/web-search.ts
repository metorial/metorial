import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerplexityClient } from '../lib/client';
import { spec } from '../spec';

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Perform raw web searches using Perplexity's search index covering hundreds of billions of webpages. Returns ranked results with pre-extracted snippets, ready for use in RAG pipelines or custom synthesis workflows.

Unlike chat completions, this returns **raw search results** without AI-generated summaries, giving you full control over how results are processed and presented.

Supports domain filtering, date filtering, recency filtering, language filtering, and location-based search.`,
  instructions: [
    'Use this tool when you need raw search results rather than AI-synthesized answers.',
    'You can pass multiple queries in a single request for batch searching.',
    'Domain filters support up to 20 entries in either allowlist or denylist mode (prefix with - to exclude).',
    'Date filters use MM/DD/YYYY format.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .union([z.string(), z.array(z.string())])
        .describe('Search query or array of queries for batch search'),
      country: z
        .string()
        .max(2)
        .optional()
        .describe('ISO 3166-1 alpha-2 country code for location-based results'),
      maxResults: z
        .number()
        .min(1)
        .max(20)
        .optional()
        .describe('Maximum number of results to return (1-20, default 10)'),
      maxTokens: z
        .number()
        .optional()
        .describe('Maximum tokens for context across all results'),
      maxTokensPerPage: z
        .number()
        .optional()
        .describe('Maximum tokens per individual page snippet'),
      searchDomainFilter: z
        .array(z.string())
        .optional()
        .describe('Limit to specific domains (prefix with - to exclude, max 20)'),
      searchLanguageFilter: z
        .array(z.string())
        .optional()
        .describe('Filter by language (ISO 639-1 codes, max 20)'),
      searchRecencyFilter: z
        .enum(['hour', 'day', 'week', 'month', 'year'])
        .optional()
        .describe('Filter by publication recency'),
      searchAfterDate: z
        .string()
        .optional()
        .describe('Results published after this date (MM/DD/YYYY)'),
      searchBeforeDate: z
        .string()
        .optional()
        .describe('Results published before this date (MM/DD/YYYY)'),
      lastUpdatedAfter: z
        .string()
        .optional()
        .describe('Results updated after this date (MM/DD/YYYY)'),
      lastUpdatedBefore: z
        .string()
        .optional()
        .describe('Results updated before this date (MM/DD/YYYY)')
    })
  )
  .output(
    z.object({
      searchId: z.string().describe('Unique identifier for this search request'),
      serverTime: z.string().optional().describe('Server timestamp'),
      results: z
        .array(
          z.object({
            title: z.string().describe('Page title'),
            url: z.string().describe('Page URL'),
            snippet: z.string().describe('Relevant text snippet from the page'),
            date: z.string().optional().describe('Publication date'),
            lastUpdated: z.string().optional().describe('Last updated date')
          })
        )
        .describe('Ranked search results'),
      resultCount: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerplexityClient(ctx.auth.token);

    let response = await client.search({
      query: ctx.input.query,
      country: ctx.input.country,
      max_results: ctx.input.maxResults,
      max_tokens: ctx.input.maxTokens,
      max_tokens_per_page: ctx.input.maxTokensPerPage,
      search_domain_filter: ctx.input.searchDomainFilter,
      search_language_filter: ctx.input.searchLanguageFilter,
      search_recency_filter: ctx.input.searchRecencyFilter,
      search_after_date_filter: ctx.input.searchAfterDate,
      search_before_date_filter: ctx.input.searchBeforeDate,
      last_updated_after_filter: ctx.input.lastUpdatedAfter,
      last_updated_before_filter: ctx.input.lastUpdatedBefore
    });

    let results = response.results.map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      date: r.date ?? undefined,
      lastUpdated: r.last_updated ?? undefined
    }));

    let queryPreview = Array.isArray(ctx.input.query)
      ? ctx.input.query.join(', ')
      : ctx.input.query;

    return {
      output: {
        searchId: response.id,
        serverTime: response.server_time ?? undefined,
        results,
        resultCount: results.length
      },
      message: `Found **${results.length}** results for "${queryPreview.substring(0, 100)}${queryPreview.length > 100 ? '...' : ''}"`
    };
  })
  .build();
