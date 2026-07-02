import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let searchResultSchema = z.object({
  url: z.string().describe('URL of the search result'),
  content: z.string().describe('Extracted page content')
});

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Perform a web search using the Exa search service through Langbase. Returns URLs and extracted page content for search results. Requires an Exa API key.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query'),
      searchApiKey: z.string().describe('Exa API key for the web search service'),
      totalResults: z
        .number()
        .optional()
        .describe('Number of results to return (defaults to 10)'),
      domains: z.array(z.string()).optional().describe('Filter results to specific domains')
    })
  )
  .output(
    z.object({
      results: z.array(searchResultSchema).describe('Search results with URLs and content'),
      resultCount: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {
      query: ctx.input.query,
      service: 'exa'
    };

    if (ctx.input.totalResults !== undefined) body.totalResults = ctx.input.totalResults;
    if (ctx.input.domains !== undefined) body.domains = ctx.input.domains;

    let result = await client.webSearch(body, ctx.input.searchApiKey);
    let results = (Array.isArray(result) ? result : []).map((r: any) => ({
      url: r.url ?? '',
      content: r.content ?? ''
    }));

    return {
      output: {
        results,
        resultCount: results.length
      },
      message: `Found **${results.length}** search result(s) for "${ctx.input.query}".`
    };
  })
  .build();
