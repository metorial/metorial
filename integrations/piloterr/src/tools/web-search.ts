import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let webSearch = SlateTool.create(spec, {
  name: 'Bing & Brave Search',
  key: 'web_search',
  description: `Search the web using Bing or Brave search engines and retrieve structured organic results with titles, links, snippets, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      engine: z.enum(['bing', 'brave']).describe('Search engine to use'),
      page: z.number().optional().describe('Page number for pagination'),
      resultsPerPage: z
        .number()
        .optional()
        .describe('Number of results per page (Bing only, 10-50)'),
      location: z
        .string()
        .optional()
        .describe('Geographic location for localized results (Bing only)'),
      market: z.string().optional().describe('Market code e.g., "en-us" (Bing only)'),
      countryCode: z.string().optional().describe('Two-letter country code (Bing only)')
    })
  )
  .output(
    z.object({
      organicResults: z
        .array(
          z.object({
            link: z.string().optional(),
            title: z.string().optional(),
            domain: z.string().optional(),
            snippet: z.string().optional(),
            position: z.number().optional(),
            displayedLink: z.string().optional()
          })
        )
        .describe('Organic search results'),
      pagination: z.any().optional().describe('Pagination information'),
      searchParameters: z.any().optional().describe('Parameters used for the search')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result: any;

    if (ctx.input.engine === 'bing') {
      result = await client.bingSearch({
        query: ctx.input.query,
        page: ctx.input.page,
        num: ctx.input.resultsPerPage,
        location: ctx.input.location,
        mkt: ctx.input.market,
        cc: ctx.input.countryCode
      });
    } else {
      result = await client.braveSearch({
        query: ctx.input.query,
        page: ctx.input.page
      });
    }

    let results = (result.organic_results ?? []).map((r: any) => ({
      link: r.link,
      title: r.title,
      domain: r.domain,
      snippet: r.snippet,
      position: r.position,
      displayedLink: r.displayed_link
    }));

    return {
      output: {
        organicResults: results,
        pagination: result.pagination,
        searchParameters: result.search_parameters
      },
      message: `**${ctx.input.engine.charAt(0).toUpperCase() + ctx.input.engine.slice(1)}** search for **"${ctx.input.query}"** returned **${results.length} results**.`
    };
  })
  .build();
