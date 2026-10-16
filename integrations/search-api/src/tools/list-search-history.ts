import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchApiClient } from '../lib/client';
import { spec } from '../spec';

export let listSearchHistory = SlateTool.create(spec, {
  name: 'List Search History',
  key: 'list_search_history',
  description:
    'Retrieve saved searches from the past 90 days, including original parameters, status, timing, and provider result links. Requires an active SearchApi subscription. Use nextPageToken to continue.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum results per page, from 1 to 100; defaults to 20'),
      engine: z
        .string()
        .optional()
        .describe('Filter by search engine, such as google or bing'),
      timePeriodMin: z.string().optional().describe('Start date, in YYYY-MM-DD format'),
      timePeriodMax: z.string().optional().describe('End date, in YYYY-MM-DD format'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Continuation token from the previous page')
    })
  )
  .output(
    z.object({
      searches: z.array(
        z.object({
          id: z.string().describe('Saved search identifier'),
          engine: z.string().describe('Search engine'),
          params: z.record(z.string(), z.unknown()).describe('Original search parameters'),
          status: z.string().describe('Search status'),
          createdAt: z.string().describe('Search creation timestamp'),
          requestTimeTaken: z.number().optional().describe('Request duration in seconds'),
          parsingTimeTaken: z.number().optional().describe('Parsing duration in seconds'),
          totalTimeTaken: z.number().optional().describe('Total duration in seconds'),
          htmlUrl: z.string().optional().describe('Provider HTML result link'),
          jsonUrl: z.string().optional().describe('Provider JSON result link')
        })
      ),
      nextPageToken: z
        .string()
        .optional()
        .describe('Continuation token for more saved searches'),
      raw: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let data = await new SearchApiClient({ token: ctx.auth.token }).getSearchHistory({
      limit: ctx.input.limit,
      engine: ctx.input.engine,
      time_period_min: ctx.input.timePeriodMin,
      time_period_max: ctx.input.timePeriodMax,
      next_page_token: ctx.input.nextPageToken
    });
    return {
      output: {
        searches: data.searches.map((search: any) => ({
          id: search.id,
          engine: search.engine,
          params: search.params,
          status: search.status,
          createdAt: search.created_at,
          requestTimeTaken: search.request_time_taken,
          parsingTimeTaken: search.parsing_time_taken,
          totalTimeTaken: search.total_time_taken,
          htmlUrl: search.html_url,
          jsonUrl: search.json_url
        })),
        nextPageToken: data.pagination?.next_page_token,
        raw: data
      },
      message: `Retrieved ${data.searches.length} saved searches on this page.`
    };
  })
  .build();
